import { useCallback, useEffect, useState } from "react";
import {
  walletLogin,
  WalletMode,
  sendTransaction,
  type Wallet,
} from "@effectstream/wallets";
import { effectstreamConfig } from "../effectstream-config.ts";
import { getEthProvider } from "../miniapp.ts";

export interface WalletState {
  address: `0x${string}` | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  submit: (input: unknown[]) => Promise<void>;
}

let cachedWallet: Wallet | null = null;

function getInjectedProvider(): { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | undefined {
  const miniProvider = getEthProvider();
  if (miniProvider) {
    // If the Mini App host injects a provider, expose it as window.ethereum so
    // the underlying injected-wallet connector picks it up. No-op when MetaMask
    // is already present in a regular browser tab.
    const w = globalThis as { ethereum?: unknown };
    if (!w.ethereum) w.ethereum = miniProvider;
    return miniProvider as never;
  }
  return (globalThis as { ethereum?: never }).ethereum;
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const provider = getInjectedProvider();
      if (!provider) throw new Error("No EIP-1193 provider found (install MetaMask or open in a Farcaster client)");

      const result = await walletLogin({
        mode: WalletMode.EvmInjected,
        preferBatchedMode: effectstreamConfig.preferBatchedMode,
        checkChainId: true,
        chain: effectstreamConfig.effectstreamL2Chain,
      });

      if (!result.success) throw new Error(result.errorMessage);
      cachedWallet = result.result;
      setAddress(cachedWallet.walletAddress as `0x${string}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      console.error("[useWallet] connect failed:", err);
      setError(msg);
    } finally {
      setConnecting(false);
    }
  }, []);

  // Eagerly surface an already-authorized address from the injected provider.
  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider) return;
    (async () => {
      try {
        const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
        if (accounts?.[0]) setAddress(accounts[0] as `0x${string}`);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const submit = useCallback(async (input: unknown[]) => {
    if (!cachedWallet) await connect();
    if (!cachedWallet) throw new Error("Wallet not connected");
    await sendTransaction(
      cachedWallet,
      input,
      effectstreamConfig,
      "wait-effectstream-processed",
    );
  }, [connect]);

  return { address, connecting, error, connect, submit };
}
