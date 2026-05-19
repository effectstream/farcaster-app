import type { OrchestratorConfig } from "@effectstream/orchestrator/config";

// Production orchestrator: no PGlite (use managed Postgres), no anvil (use Base RPC).
// Run the node + batcher + static frontend server alongside each other. The
// frontend assumes its dist/ has already been built (CI step or `bun run build:frontend`).

export default {
  processes: [
    {
      name: "node",
      description: "Farcaster Canvas sync node + API (mainnet)",
      args: ["run", "packages/node/main.mainnet.ts"],
      waitToExit: false,
      type: "system-dependency",
      stopProcessAtPort: [Number(process.env.NODE_PORT ?? 3333)],
      link: `http://localhost:${process.env.NODE_PORT ?? 3333}`,
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

    {
      name: "frontend",
      description: "Mini App static server (mainnet)",
      args: ["run", "--filter", "@farcaster-canvas/frontend", "serve"],
      waitToExit: false,
      type: "system-dependency",
      stopProcessAtPort: [Number(process.env.FRONTEND_PORT ?? 10599)],
      link: `http://localhost:${process.env.FRONTEND_PORT ?? 10599}`,
      dependsOn: [],
    },
  ],
} satisfies OrchestratorConfig;
