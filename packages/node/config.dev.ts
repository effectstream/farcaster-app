import { contractAddressesEvmMain } from "@farcaster-canvas/contracts-evm";
import { getConnection } from "@effectstream/db";
import {
  ConfigBuilder,
  ConfigNetworkType,
  ConfigSyncProtocolType,
} from "@effectstream/config";
import { hardhat } from "viem/chains";
import { PrimitiveTypeEVMEffectstreamL2 } from "@effectstream/sm/builtin";

import { effectstreamL2Grammar } from "./grammar.ts";

const mainSyncProtocolName = "mainNtp";
let launchStartTime: number | undefined;

// Recover the original launch time from the DB so that restarts don't reset
// the NTP main clock (which would re-process every block from scratch).
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
    // DB not initialized yet — first boot.
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
        blockTimeMS: 1000,
      })
      .addViemNetwork({ ...hardhat, name: "evmMain" }),
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
          pollingInterval: 500,
        }),
      )
      .addParallel(
        (networks) => networks.evmMain,
        (n, _d) => ({
          name: "canvas-l2",
          type: ConfigSyncProtocolType.EVM_RPC_PARALLEL,
          chainUri: process.env.CHAIN_URI ?? n.rpcUrls.default.http[0],
          startBlockHeight: Number(process.env.START_BLOCKHEIGHT ?? "1"),
          pollingInterval: 500,
          confirmationDepth: 1,
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
        startBlockHeight: 0,
        contractAddress: contractAddressesEvmMain().chain31337[
          "CanvasGameModule#CanvasGame"
        ],
        effectstreamL2Grammar,
      }),
    ),
  )
  .build();
