import { getConnection } from "@effectstream/db";
import {
  ConfigBuilder,
  ConfigNetworkType,
  ConfigSyncProtocolType,
} from "@effectstream/config";
import { base } from "viem/chains";
import { PrimitiveTypeEVMEffectstreamL2 } from "@effectstream/sm/builtin";

import { effectstreamL2Grammar } from "./grammar.ts";

// Fail fast on missing env vars — per Effectstream guidelines.
const EVM_RPC_URL = process.env.EVM_RPC_URL;
const CANVAS_GAME_ADDRESS = process.env.CANVAS_GAME_ADDRESS as
  | `0x${string}`
  | undefined;
const START_BLOCKHEIGHT = process.env.START_BLOCKHEIGHT;
// Optional RPC throttling — raise stepSize for chunkier eth_getLogs calls,
// raise delayMs to pace requests under a provider's rate limit.
const EVM_STEP_SIZE = process.env.EVM_STEP_SIZE
  ? Number(process.env.EVM_STEP_SIZE)
  : 1000;
const EVM_DELAY_MS = process.env.EVM_DELAY_MS
  ? Number(process.env.EVM_DELAY_MS)
  : 0;
const DB_HOST = process.env.DB_HOST;
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PW = process.env.DB_PW;

if (!EVM_RPC_URL) throw new Error("EVM_RPC_URL required for mainnet");
if (!CANVAS_GAME_ADDRESS) throw new Error("CANVAS_GAME_ADDRESS required for mainnet");
if (!START_BLOCKHEIGHT) throw new Error("START_BLOCKHEIGHT required for mainnet");
if (!DB_HOST) throw new Error("DB_HOST required for mainnet");
if (!DB_NAME) throw new Error("DB_NAME required for mainnet");
if (!DB_USER) throw new Error("DB_USER required for mainnet");
if (!DB_PW) throw new Error("DB_PW required for mainnet");

const mainSyncProtocolName = "mainNtp";
let launchStartTime: number | undefined;

if (typeof process !== "undefined") {
  const dbConn = getConnection();
  try {
    const result = await dbConn.query(`
      SELECT * FROM effectstream.sync_protocol_pagination
      WHERE protocol_name = '${mainSyncProtocolName}'
      ORDER BY page_number ASC
      LIMIT 1
    `);
    if (result?.rows.length) {
      launchStartTime = result.rows[0].page.root -
        result.rows[0].page_number * 1000;
    }
  } catch {
    // First boot on mainnet.
  }
}

export const config = new ConfigBuilder()
  .setNamespace((b) => b.setSecurityNamespace("farcaster-canvas"))
  .buildNetworks((b) =>
    b
      .addNetwork({
        name: "ntp",
        type: ConfigNetworkType.NTP,
        startTime: launchStartTime ?? new Date().getTime(),
        blockTimeMS: 2000,
      })
      .addViemNetwork({ ...base, name: "evmMain" }),
  )
  .buildDeployments((b) => b)
  .buildSyncProtocols((b) =>
    b
      .addMain(
        (networks) => networks.ntp,
        (_n, _d) => ({
          name: mainSyncProtocolName,
          type: ConfigSyncProtocolType.NTP_MAIN,
          chainUri: "",
          startBlockHeight: 1,
          pollingInterval: 2000,
        }),
      )
      .addParallel(
        (_networks) => _networks.evmMain,
        (_n, _d) => ({
          name: "canvas-l2",
          type: ConfigSyncProtocolType.EVM_RPC_PARALLEL,
          chainUri: EVM_RPC_URL!,
          startBlockHeight: Number(START_BLOCKHEIGHT),
          pollingInterval: 2000,
          confirmationDepth: 3,
          stepSize: EVM_STEP_SIZE,
          delayMs: EVM_DELAY_MS,
        }),
      ),
  )
  .buildPrimitives((b) =>
    b.addPrimitive(
      (syncProtocols) =>
        (syncProtocols as any)["canvas-l2" as keyof typeof syncProtocols],
      (_network, _deployments, _syncProtocol) => ({
        name: "CanvasL2",
        type: PrimitiveTypeEVMEffectstreamL2,
        startBlockHeight: Number(START_BLOCKHEIGHT),
        contractAddress: CANVAS_GAME_ADDRESS!,
        effectstreamL2Grammar,
      }),
    ),
  )
  .build();
