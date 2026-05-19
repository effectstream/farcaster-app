import { createHardhatRuntimeEnvironment } from "hardhat/hre";
import * as config from "./hardhat.config.ts";
import CanvasGameModule from "./ignition/modules/canvasGame.ts";
import type { buildModule } from "@nomicfoundation/ignition-core";

const __dirname: any = import.meta.dirname;

type Deployment = {
  module: ReturnType<typeof buildModule>;
  network: string;
  parameters?: Record<string, Record<string, any>>;
};

// Hardhat #0 — well-known anvil account. In prod we use --network base and pass
// owner via env. The fee here is 0 because EffectstreamL2Contract's fee is for
// the base submission cost; the per-paint fee is enforced inside CanvasGame.sol.
const myDeployments: Deployment[] = [
  {
    module: CanvasGameModule,
    network: "evmMainHttp",
    parameters: {
      CanvasGameModule: {
        owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        fee: 0,
      },
    },
  },
];

export async function deploy(): Promise<void> {
  const hre = await createHardhatRuntimeEnvironment(config.default, __dirname);
  const messages: string[] = [];
  for (const d of myDeployments) {
    const network = await hre.network.connect(d.network);
    const result = await (network as any).ignition.deploy(
      d.module,
      d.parameters ? { parameters: d.parameters } : undefined,
    );
    messages.push(
      `${d.module.id.substring(0, 30).padEnd(30)} @ ${d.network.padEnd(16)} -> ${result.canvasGame.address}`,
    );
  }
  console.log("Deployed contracts:\n", messages.join("\n"));
  // Give Hardhat a moment to flush logs/files before exiting.
  await new Promise((r) => setTimeout(r, 2000));
}

if (import.meta.main) {
  await deploy();
}
