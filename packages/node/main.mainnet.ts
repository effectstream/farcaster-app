import { init, start } from "@effectstream/runtime";
import { main, suspend } from "effection";
import {
  toSyncProtocolWithNetwork,
  withEffectstreamStaticConfig,
} from "@effectstream/config";
import { migrationTable } from "@farcaster-canvas/database";
import { apiRouter } from "./api.ts";
import { config } from "./config.mainnet.ts";
import { gameStateTransitions } from "./state-machine.ts";
import { grammar } from "./grammar.ts";

main(function* () {
  yield* init();
  yield* withEffectstreamStaticConfig(config, function* () {
    yield* start({
      appName: "farcaster-canvas",
      appVersion: "0.1.0",
      syncInfo: toSyncProtocolWithNetwork(config),
      gameStateTransitions,
      migrations: migrationTable,
      apiRouter,
      grammar,
    });
  });
  yield* suspend();
});
