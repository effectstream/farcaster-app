import { main, suspend } from "effection";
import {
  createNewBatcher,
  FileStorage,
  type BatcherConfig,
  type DefaultBatcherInput,
} from "@effectstream/batcher-sdk";
import { ENV } from "@effectstream/utils/node-env";
import * as chains from "viem/chains";

import { createEffectstreamL2Adapter } from "./effectstream-l2.ts";

const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY;
const CANVAS_GAME_ADDRESS = process.env.CANVAS_GAME_ADDRESS;
if (!EVM_PRIVATE_KEY) throw new Error("EVM_PRIVATE_KEY required for mainnet batcher");
if (!CANVAS_GAME_ADDRESS) throw new Error("CANVAS_GAME_ADDRESS required for mainnet batcher");

const batchIntervalMs = 2000;
const port = ENV.getNumber("BATCHER_PORT", 3334);

const adapter = createEffectstreamL2Adapter({
  contractAddress: CANVAS_GAME_ADDRESS as `0x${string}`,
  privateKey: EVM_PRIVATE_KEY as `0x${string}`,
  fee: 0n,
  syncProtocolName: "canvas-l2",
  chain: chains.base,
});

const config: BatcherConfig<DefaultBatcherInput> = {
  pollingIntervalMs: batchIntervalMs,
  enableHttpServer: true,
  namespace: "",
  confirmationLevel: "wait-effectstream-processed",
  enableEventSystem: true,
  port,
};

const storage = new FileStorage("./batcher-data");
const batcher = createNewBatcher(config, storage);

batcher
  .addBlockchainAdapter("canvas-l2", adapter, {
    criteriaType: "time",
    timeWindowMs: batchIntervalMs,
  })
  .setDefaultTarget("canvas-l2");

main(function* () {
  console.log("Starting Farcaster Canvas batcher (mainnet)...");
  try {
    yield* batcher.runBatcher();
  } catch (err) {
    console.error("Batcher error:", err);
    yield* batcher.gracefulShutdownOp();
  }
  yield* suspend();
});
