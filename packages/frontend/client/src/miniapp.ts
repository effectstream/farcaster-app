import { sdk } from "@farcaster/miniapp-sdk";

/**
 * Minimal EIP-1193 shape we rely on. Both `sdk.wallet.ethProvider` and
 * `window.ethereum` (MetaMask et al.) satisfy this.
 */
export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

/**
 * EIP-6963 announce-provider event payload — multi-injected provider spec
 * (https://eips.ethereum.org/EIPS/eip-6963). Every modern browser wallet
 * (MetaMask, Rabby, Coinbase, Trust, etc.) announces itself this way.
 */
export type Eip6963ProviderDetail = {
  info: {
    uuid: string;
    name: string;
    rdns: string;
    icon: string;
  };
  provider: Eip1193Provider;
};

/**
 * Cached "are we inside a Farcaster Mini App host?" answer.
 *
 * `sdk.isInMiniApp()` has a built-in postMessage probe with a timeout, so it's
 * safe to call from a regular browser tab. The result is stable for the
 * lifetime of the page, so we memoize.
 */
let cachedInMiniApp: boolean | null = null;
export async function isInMiniApp(timeoutMs = 800): Promise<boolean> {
  if (cachedInMiniApp !== null) return cachedInMiniApp;
  try {
    cachedInMiniApp = await sdk.isInMiniApp(timeoutMs);
  } catch {
    cachedInMiniApp = false;
  }
  return cachedInMiniApp;
}

/**
 * Pull the Mini App context (fid, username, location, etc.) on boot.
 * Outside a Farcaster client this resolves to `undefined`.
 */
export async function getMiniAppContext() {
  if (!(await isInMiniApp())) return undefined;
  try {
    return await sdk.context;
  } catch {
    return undefined;
  }
}

/**
 * Mandatory: dismisses the splash screen. If `ready()` is never called, users
 * see an infinite loading state. Safe no-op outside a Mini App host.
 */
export async function markReady() {
  if (!(await isInMiniApp())) return;
  try {
    await sdk.actions.ready();
  } catch (err) {
    console.warn("[miniapp] ready() failed:", err);
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
 * Returns the Farcaster Mini App's injected EIP-1193 provider, or `undefined`
 * outside a Mini App host.
 *
 * IMPORTANT: we do NOT call `sdk.wallet.getEthereumProvider()` here. That
 * function calls `miniAppHost.getCapabilities()` which posts a Comlink RPC to
 * `window.parent`; in a regular browser tab there is no parent that responds,
 * and the promise hangs indefinitely. `sdk.isInMiniApp()` has a real timeout,
 * so we use that for detection, then read `sdk.wallet.ethProvider` synchronously
 * once we know we're in a host that can respond.
 */
export async function getEthProvider(): Promise<Eip1193Provider | undefined> {
  if (!(await isInMiniApp())) return undefined;
  return sdk.wallet.ethProvider as unknown as Eip1193Provider;
}

/**
 * Discover EIP-6963 wallet providers in the current page.
 *
 * We dispatch `eip6963:requestProvider` and collect every `announceProvider`
 * response within `timeoutMs`. Most extensions reply synchronously, but the
 * Farcaster SDK (when present) round-trips via postMessage to the host, so we
 * give the bus a small window. The function de-dupes by `rdns` (the reverse-DNS
 * wallet identifier, e.g. `io.metamask`) and sinks Brave's aggressive injection
 * to the end so MetaMask / Rabby win when both are installed alongside it.
 */
const AGGRESSIVE_RDNS = new Set(["com.brave.wallet"]);
export async function discoverEip6963Providers(
  timeoutMs = 300,
): Promise<Eip6963ProviderDetail[]> {
  if (typeof window === "undefined") return [];

  const found: Eip6963ProviderDetail[] = [];
  const seen = new Set<string>();

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
    if (detail?.info?.rdns && !seen.has(detail.info.rdns)) {
      seen.add(detail.info.rdns);
      found.push(detail);
    }
  };

  window.addEventListener("eip6963:announceProvider", listener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  window.removeEventListener("eip6963:announceProvider", listener);

  return found.sort((a, b) => {
    const aBad = AGGRESSIVE_RDNS.has(a.info.rdns) ? 1 : 0;
    const bBad = AGGRESSIVE_RDNS.has(b.info.rdns) ? 1 : 0;
    return aBad - bBad;
  });
}
