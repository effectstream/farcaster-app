import type { OrchestratorConfig } from "@effectstream/orchestrator/config";

// Production orchestrator: no PGlite (use managed Postgres), no anvil (use Base RPC).
// Runs node + batcher side-by-side so the batcher SDK's hardcoded
// `http://localhost:${EFFECTSTREAM_API_PORT}` confirmation calls reach the node.
// The frontend is deployed separately (Cloudflare Pages) and is NOT started here.

export default {
  processes: [
    {
      name: "node",
      description: "Farcaster Canvas sync node + API (mainnet)",
      args: ["run", "packages/node/main.mainnet.ts"],
      waitToExit: false,
      type: "system-dependency",
      stopProcessAtPort: [Number(process.env.EFFECTSTREAM_API_PORT ?? 9999)],
      link: `http://localhost:${process.env.EFFECTSTREAM_API_PORT ?? 9999}`,
      dependsOn: [],
    },

    {
      name: "batcher",
      description: "Transaction batcher (mainnet)",
      args: ["run", "packages/batcher/batcher.mainnet.ts"],
      waitToExit: false,
      type: "system-dependency",
      stopProcessAtPort: [Number(process.env.BATCHER_PORT ?? 3334)],
      link: `http://localhost:${process.env.BATCHER_PORT ?? 3334}`,
      dependsOn: [],
    },
  ],
} satisfies OrchestratorConfig;
