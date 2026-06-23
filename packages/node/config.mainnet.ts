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
// NTP block period in ms — must match `blockTimeMS` below. Used to reconstruct
// the original launchStartTime from a stored page row on restart. (Dev uses
// 1000ms blocks; mainnet uses 2000ms — mismatch here causes "Immutable config
// fields have changed for protocol mainNtp" on every restart.)
const NTP_BLOCK_TIME_MS = 2000;
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
        result.rows[0].page_number * NTP_BLOCK_TIME_MS;
    }
  } catch {
    // First boot on mainnet.
  }
}

export const config = new ConfigBuilder()
  // MUST match the namespace the frontend signs with and the batcher admits with.
  // The frontend (effectstream-config.ts EffectstreamConfig appName) and batcher
  // (batcher.mainnet.ts BatcherConfig.namespace) both use "". The node verifies each
  // batched input's signature via getReadNamespaces(securityNamespace); if it doesn't
  // match the signer's namespace, verifySignature fails and EVERY batched input is
  // dropped as "Invalid signature for batched message" — events get fetched but no
  // canvas/paint is ever created. Was "farcaster-canvas" (verifier ≠ signer). Keep ""
  // until the frontend+batcher are redeployed with a real namespace.
  .setNamespace((b) => b.setSecurityNamespace(""))
  .buildNetworks((b) =>
    b
      .addNetwork({
        name: "ntp",
        type: ConfigNetworkType.NTP,
        startTime: launchStartTime ?? new Date().getTime(),
        blockTimeMS: NTP_BLOCK_TIME_MS,
      })
      // viem's `base` chain includes `formatters` / `serializers` / `fees` as
      // function properties, which @effectstream/config's TypeBox Clone() can
      // not deep-clone (crashes with "ValueClone: Unable to clone value").
      // Pass only the JSON-safe fields. (Dev uses `hardhat`, which has none.)
      .addViemNetwork({
        id: base.id,
        name: "evmMain",
        nativeCurrency: base.nativeCurrency,
        // Override the public Base RPC (`mainnet.base.org`) with the user's
        // Alchemy endpoint. The public node returns malformed/empty bodies for
        // some viem calls under load, which crashes the HTTP transport with
        // "Cannot destructure property 'error' from null".
        rpcUrls: {
          default: { http: [EVM_RPC_URL!] },
        },
        blockExplorers: base.blockExplorers,
        testnet: base.testnet,
        contracts: base.contracts,
      }),
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
