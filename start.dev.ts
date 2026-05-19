import path from "node:path";
import type { OrchestratorConfig } from "@effectstream/orchestrator/config";
import { DbNames, launchPglite } from "@effectstream/orchestrator/launch-pglite";
import { EvmNames, launchEvm } from "@effectstream/orchestrator/launch-evm";

const root = import.meta.dirname!;

export default {
  processes: [
    ...launchPglite(),
    ...launchEvm("@farcaster-canvas/contracts-evm", {
      cwd: path.join(root, "packages/contracts-evm"),
    }),

    {
      name: "node",
      description: "Farcaster Canvas sync node + API",
      args: ["run", "packages/node/main.dev.ts"],
      waitToExit: false,
      type: "system-dependency",
      env: { PGLITE: "true", MQTT_BROKER: "false" },
      stopProcessAtPort: [Number(process.env.EFFECTSTREAM_API_PORT ?? 9999)],
      link: `http://localhost:${process.env.EFFECTSTREAM_API_PORT ?? 9999}`,
      dependsOn: [DbNames.PGLITE_WAIT, EvmNames.GENERATE_MOD],
    },

    {
      name: "batcher",
      description: "Transaction batcher",
      args: ["run", "packages/batcher/batcher.dev.ts"],
      waitToExit: false,
      type: "system-dependency",
      stopProcessAtPort: [3334],
      link: "http://localhost:3334",
      dependsOn: [EvmNames.GENERATE_MOD],
    },

    {
      name: "frontend",
      description: "Mini App (Vite dev server)",
      args: ["run", "--filter", "@farcaster-canvas/frontend", "dev"],
      waitToExit: false,
      type: "system-dependency",
      stopProcessAtPort: [5173],
      link: "http://localhost:5173",
      dependsOn: [],
    },
  ],
} satisfies OrchestratorConfig;
