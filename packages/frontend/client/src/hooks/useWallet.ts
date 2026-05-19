import { useCallback, useEffect, useState } from "react";
import { walletLogin, WalletMode, sendTransaction } from "@effectstream/wallets";
import { effectstreamConfig } from "../effectstream-config.ts";
import { getEthProvider } from "../miniapp.ts";

export interface WalletState {
  address: `0x${string}` | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  submit: (input: unknown[]) => Promise<void>;
}

let cachedWallet: Awaited<ReturnType<typeof walletLogin>> | null = null;

export function useWallet(): WalletState {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      // Prefer the Mini App host's injected provider; fall back to window.ethereum.
      const provider = getEthProvider() ?? (globalThis as any).ethereum;
      if (!provider) throw new Error("No EIP-1193 provider available");
      cachedWallet = await walletLogin(effectstreamConfig, WalletMode.EvmInjected, {
        provider,
      } as never);
      setAddress(cachedWallet.address as `0x${string}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }, []);

  // Eagerly attempt to surface an already-authorized address from the Mini App host.
  useEffect(() => {
    const provider = getEthProvider();
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
      input as never,
      effectstreamConfig,
      "wait-effectstream-processed",
    );
  }, [connect]);

  return { address, connecting, error, connect, submit };
}
