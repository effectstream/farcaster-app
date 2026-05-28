import type { OrchestratorConfig } from "@effectstream/orchestrator/config";
import { DbNames, launchPglite } from "@effectstream/orchestrator/launch-pglite";

// Production orchestrator for node + batcher.
// PGLITE=true boots an in-process PGlite (data dir on a Fly volume) and routes
// both processes at localhost; otherwise they use a managed Postgres via DB_*.

const PGLITE_MODE = process.env.PGLITE === "true";

// One-shot wipe of the PGlite data dir before startup. Set via deploy_pglite.sh
// --reset; must be unset afterwards or every restart re-wipes.
const PGLITE_RESET = process.env.PGLITE_RESET === "true";
const PGLITE_DATA_DIR = process.env.PGLITE_DATA_DIR ?? "/app/batcher-data/pgdata";
const PGLITE_RESET_PROCESS = "pglite-reset";

// In PGlite mode, node + batcher must wait for the pg-gateway TCP shim or
// their boot-time pool init races startup and ECONNREFUSEs.
const dbDependsOn = PGLITE_MODE ? [DbNames.PGLITE_WAIT] : [];

const pgliteProcesses = PGLITE_MODE ? launchPglite() : [];
if (PGLITE_MODE && PGLITE_RESET) {
  const pglite = pgliteProcesses.find((p) => p.name === DbNames.PGLITE);
  if (pglite) {
    pglite.dependsOn = [...(pglite.dependsOn ?? []), PGLITE_RESET_PROCESS];
  }
  pgliteProcesses.unshift({
    name: PGLITE_RESET_PROCESS,
    description: `Wipe ${PGLITE_DATA_DIR} before PGlite starts`,
    command: "sh",
    args: [
      "-c",
      `set -e; ` +
        `echo "[pglite-reset] wiping ${PGLITE_DATA_DIR}"; ` +
        `mkdir -p "${PGLITE_DATA_DIR}"; ` +
        `rm -rf "${PGLITE_DATA_DIR}"/* "${PGLITE_DATA_DIR}"/.[!.]* 2>/dev/null || true; ` +
        `echo "[pglite-reset] done"`,
    ],
    waitToExit: true,
    critical: true,
  });
}

export default {
  processes: [
    ...pgliteProcesses,
    {
      name: "node",
      description: `Farcaster Canvas sync node + API (mainnet${PGLITE_MODE ? ", PGlite mode" : ""})`,
      args: ["run", "packages/node/main.mainnet.ts"],
      waitToExit: false,
      type: "system-dependency",
      stopProcessAtPort: [Number(process.env.EFFECTSTREAM_API_PORT ?? 9999)],
      link: `http://localhost:${process.env.EFFECTSTREAM_API_PORT ?? 9999}`,
      dependsOn: dbDependsOn,
    },
    {
      name: "batcher",
      description: `Transaction batcher (mainnet${PGLITE_MODE ? ", PGlite mode" : ""})`,
      args: ["run", "packages/batcher/batcher.mainnet.ts"],
      waitToExit: false,
      type: "system-dependency",
      stopProcessAtPort: [Number(process.env.BATCHER_PORT ?? 3334)],
      link: `http://localhost:${process.env.BATCHER_PORT ?? 3334}`,
      dependsOn: dbDependsOn,
    },
  ],
} satisfies OrchestratorConfig;
