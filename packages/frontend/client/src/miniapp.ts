import { sdk } from "@farcaster/miniapp-sdk";

/**
 * Pull the Mini App context (fid, username, location, etc.) on boot.
 * Outside a Farcaster client this resolves to `undefined`.
 */
export async function getMiniAppContext() {
  try {
    return await sdk.context;
  } catch {
    return undefined;
  }
}

/**
 * Mandatory: dismisses the splash screen.
 * If `ready()` is never called, users see an infinite loading state.
 */
export async function markReady() {
  try {
    await sdk.actions.ready();
  } catch (err) {
    // Outside a Mini App host this is a no-op; log so we notice it in dev.
    console.warn("[miniapp] ready() failed (likely running outside Farcaster):", err);
  }
}

/**
 * Compose a cast that embeds a canvas URL. Called from the Share button after
 * forking — Farcaster renders the canvas page's `fc:miniapp` embed as a preview.
 */
export async function shareCanvas(canvasId: number, opts?: { forked?: boolean }) {
  const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin;
  const text = opts?.forked
    ? `Just forked Canvas #${canvasId} — come paint with me!`
    : `Painting on Canvas #${canvasId}`;
  await sdk.actions.composeCast({
    text,
    embeds: [`${appUrl}/canvas/${canvasId}`],
  });
}

/**
 * Expose the EIP-1193 wallet provider that the Mini App host injects.
 * Resolves to `undefined` outside a Farcaster client so callers can fall back
 * to `window.ethereum` (MetaMask etc.). Used by `@effectstream/wallets`
 * walletLogin in EvmInjected mode.
 */
export async function getEthProvider() {
  return await sdk.wallet.getEthereumProvider();
}
