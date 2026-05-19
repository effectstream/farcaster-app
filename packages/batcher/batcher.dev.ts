import { main, suspend } from "effection";
import {
  createNewBatcher,
  FileStorage,
  type BatcherConfig,
  type DefaultBatcherInput,
} from "@effectstream/batcher-sdk";
import { ENV } from "@effectstream/utils/node-env";
import * as chains from "viem/chains";
import { contractAddressesEvmMain } from "@farcaster-canvas/contracts-evm";

import { createEffectstreamL2Adapter } from "./effectstream-l2.ts";

const batchIntervalMs = 1000;
const port = ENV.getNumber("BATCHER_PORT", 3334);

const contractAddress = contractAddressesEvmMain().chain31337[
  "CanvasGameModule#CanvasGame"
] as `0x${string}`;

// Hardhat account #2 — leaves #0/#1 free for tests and direct user submissions.
const privateKey = (process.env.BATCHER_EVM_SECRET_KEY ??
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a") as `0x${string}`;

const adapter = createEffectstreamL2Adapter({
  contractAddress,
  privateKey,
  fee: 0n,
  syncProtocolName: "canvas-l2",
  chain: chains.hardhat,
});

const config: BatcherConfig<DefaultBatcherInput> = {
  pollingIntervalMs: batchIntervalMs,
  enableHttpServer: true,
  // namespace MUST match EffectstreamConfig.appName in the frontend.
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
  console.log("Starting Farcaster Canvas batcher (dev)...");
  try {
    yield* batcher.runBatcher();
  } catch (err) {
    console.error("Batcher error:", err);
    yield* batcher.gracefulShutdownOp();
  }
  yield* suspend();
});
