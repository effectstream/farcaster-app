import { EffectstreamConfig } from "@effectstream/wallets";
import { base, hardhat } from "viem/chains";

const chainId = Number(import.meta.env.VITE_CHAIN_ID ?? "31337");
const chain = chainId === 8453 ? base : hardhat;

// CANVAS_GAME address is patched in at runtime from /api/canvases response in
// production, or read from contracts-evm/mod.ts in dev (orchestrator regenerates).
const CONTRACT_PLACEHOLDER = "0x0000000000000000000000000000000000000000" as const;

export const effectstreamConfig = new EffectstreamConfig(
  // appName — MUST match BatcherConfig.namespace (frontend uses "" → batcher uses "")
  "",
  // syncProtocolName — must match the parallel sync name declared in config.{dev|mainnet}.ts
  // and the adapter key registered via batcher.addBlockchainAdapter(...).
  "canvas-l2",
  // EffectstreamL2 contract address — set via env at build time
  (import.meta.env.VITE_CANVAS_GAME_ADDRESS ?? CONTRACT_PLACEHOLDER) as `0x${string}`,
  chain,
  undefined,
  import.meta.env.VITE_BATCHER_URL ?? "http://localhost:3334",
  true,
);

export const apiBase = import.meta.env.VITE_API_URL ?? "/api";
