import type { HardhatUserConfig } from "hardhat/config";
import {
  createHardhatConfig,
  createNodeTasks,
  initTelemetry,
} from "@effectstream/evm-hardhat/hardhat-config-builder";

const __dirname: any = import.meta.dirname;

initTelemetry("@effectstream/log", "./package.json");

const config: HardhatUserConfig = createHardhatConfig({
  sourcesDir: `${__dirname}/src/contracts`,
  artifactsDir: `${__dirname}/build/artifacts/hardhat`,
  cacheDir: `${__dirname}/build/cache/hardhat`,
  tasks: createNodeTasks(),
  solidityVersion: "0.8.30",
});

// Add Base mainnet for `bun run deploy:mainnet`.
config.networks = {
  ...(config.networks ?? {}),
  base: {
    type: "http",
    chainType: "l1",
    url: process.env.EVM_RPC_URL ?? "https://mainnet.base.org",
    chainId: 8453,
    accounts: process.env.EVM_PRIVATE_KEY ? [process.env.EVM_PRIVATE_KEY] : [],
  } as never,
};

export default config;
