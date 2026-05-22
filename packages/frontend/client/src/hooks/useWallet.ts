import { useCallback, useEffect, useState } from "react";
import {
  walletLogin,
  WalletMode,
  sendTransaction,
  type Wallet,
} from "@effectstream/wallets";
import { effectstreamConfig } from "../effectstream-config.ts";
import {
  discoverEip6963Providers,
  getEthProvider,
  isInMiniApp,
  type Eip1193Provider,
} from "../miniapp.ts";

export interface WalletState {
  address: `0x${string}` | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  submit: (input: unknown[]) => Promise<void>;
}

// Module-level state shared across every `useWallet()` instance. Each component
// gets its own `useState`, but they all subscribe here and re-render in sync —
// so after the header's Connect button completes, `PaintControls` / `ForkButton`
// see the new address on the next tick without re-mounting.
let cachedWallet: Wallet | null = null;
let sharedAddress: `0x${string}` | null = null;
const subscribers = new Set<(addr: `0x${string}` | null) => void>();

function publishAddress(addr: `0x${string}` | null) {
  sharedAddress = addr;
  for (const cb of subscribers) cb(addr);
}

type PickedProvider = {
  source: "farcaster" | "browser";
  provider: Eip1193Provider;
  name: string;
  displayName: string;
  icon?: string;
};

/**
 * Resolve the EIP-1193 provider we should connect to. Tried in priority order:
 *
 *   1. Farcaster Mini App host — direct via `sdk.wallet.ethProvider`. This is
 *      the only path that works inside Warpcast / Base App; the SDK's own
 *      EIP-6963 announce is asynchronous (Comlink → host → postMessage back)
 *      and races against `walletLogin()`'s synchronous discovery, so we
 *      skip the bus entirely.
 *
 *   2. EIP-6963 multi-injected providers (MetaMask, Rabby, Coinbase, etc.).
 *      We dispatch `eip6963:requestProvider` ourselves and wait briefly for
 *      announces. Same fix as above: Effectstream's wallet library dispatches
 *      this once at module-load and never retries, so anything that announces
 *      late (or any wallet whose extension hadn't injected yet) is lost.
 *
 *   3. Legacy `window.ethereum` — catches old wallets that never adopted
 *      EIP-6963.
 *
 * Memoized: discovery costs ~300ms per cold call, and multiple `useWallet()`
 * instances would otherwise each pay it on mount.
 */
let cachedPick: PickedProvider | null | undefined = undefined;

async function pickInjectedProvider(): Promise<PickedProvider | null> {
  if (cachedPick !== undefined) return cachedPick;

  // 1. Farcaster Mini App host
  if (await isInMiniApp()) {
    const fc = await getEthProvider();
    if (fc) {
      cachedPick = {
        source: "farcaster",
        provider: fc,
        name: "farcaster",
        displayName: "Farcaster",
      };
      return cachedPick;
    }
  }

  // 2. EIP-6963 wallets
  const eip6963 = await discoverEip6963Providers(300);
  if (eip6963.length > 0) {
    const chosen = eip6963[0]!;
    cachedPick = {
      source: "browser",
      provider: chosen.provider,
      name: chosen.info.rdns,
      displayName: chosen.info.name,
      icon: chosen.info.icon,
    };
    return cachedPick;
  }

  // 3. Legacy window.ethereum
  const legacy = (globalThis as { ethereum?: Eip1193Provider }).ethereum;
  if (legacy) {
    cachedPick = {
      source: "browser",
      provider: legacy,
      name: "injected",
      displayName: "Browser wallet",
    };
    return cachedPick;
  }

  cachedPick = null;
  return null;
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<`0x${string}` | null>(sharedAddress);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirror the shared module state into this hook's React state.
  useEffect(() => {
    subscribers.add(setAddress);
    return () => {
      subscribers.delete(setAddress);
    };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const picked = await pickInjectedProvider();
      if (!picked) {
        throw new Error(
          "No EVM wallet detected. Open this app inside a Farcaster client, or install a browser wallet (MetaMask, Rabby, Coinbase Wallet, etc.).",
        );
      }

      // Hand the provider to the wallet library as an externally-managed
      // connection. `connectExternal()` calls `eth_requestAccounts` on it
      // directly — no EIP-6963 round-trip required, so this path is immune
      // to the race conditions described in `pickInjectedProvider`.
      const connection = {
        metadata: {
          name: picked.name,
          displayName: picked.displayName,
          icon: picked.icon,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        api: picked.provider as any,
      };

      // Chain handling:
      //   - Farcaster host wallets pick the active chain themselves and reject
      //     `wallet_switchEthereumChain` for non-Base chains, so we skip the
      //     check there.
      //   - Browser wallets should be switched to our configured chain (Base
      //     mainnet in prod, Hardhat in dev — the library auto-adds it via
      //     `wallet_addEthereumChain` if unknown).
      const result = await walletLogin({
        mode: WalletMode.EvmInjected,
        preferBatchedMode: effectstreamConfig.preferBatchedMode,
        checkChainId: picked.source !== "farcaster",
        chain: effectstreamConfig.effectstreamL2Chain,
        preference: { connection },
      });

      if (!result.success) {
        throw new Error(result.errorMessage ?? "Wallet connection failed");
      }
      cachedWallet = result.result;
      publishAddress(cachedWallet.walletAddress as `0x${string}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      console.error("[useWallet] connect failed:", err);
      setError(msg);
    } finally {
      setConnecting(false);
    }
  }, []);

  // Eagerly surface an already-authorized address from the injected provider.
  // `eth_accounts` is the non-prompting variant of `eth_requestAccounts` —
  // returns the connected address(es) if the user already authorized us,
  // [] otherwise. Both Farcaster's wallet and standard browser wallets honor it.
  useEffect(() => {
    if (sharedAddress) return; // someone else already discovered the account
    let cancelled = false;
    (async () => {
      const picked = await pickInjectedProvider();
      if (cancelled || !picked) return;
      try {
        const accounts = (await picked.provider.request({
          method: "eth_accounts",
        })) as string[];
        if (!cancelled && accounts?.[0]) {
          publishAddress(accounts[0] as `0x${string}`);
        }
      } catch {
        /* ignore — user just hasn't authorized yet */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // React to wallet-side account changes: if the user switches accounts
  // (browser wallets) or disconnects, mirror that into our shared state.
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    (async () => {
      const picked = await pickInjectedProvider();
      if (cancelled || !picked?.provider.on) return;
      const handler = (...args: unknown[]) => {
        const accounts = (args[0] as string[] | undefined) ?? [];
        if (!accounts[0]) {
          cachedWallet = null;
          publishAddress(null);
        } else {
          publishAddress(accounts[0] as `0x${string}`);
        }
      };
      picked.provider.on("accountsChanged", handler);
      cleanup = () => picked.provider.removeListener?.("accountsChanged", handler);
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  const submit = useCallback(
    async (input: unknown[]) => {
      if (!cachedWallet) await connect();
      if (!cachedWallet) throw new Error("Wallet not connected");
      await sendTransaction(
        cachedWallet,
        input,
        effectstreamConfig,
        "wait-effectstream-processed",
      );
    },
    [connect],
  );

  return { address, connecting, error, connect, submit };
}
