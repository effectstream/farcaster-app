/**
 * Print the current Base mainnet chain tip (latest block number).
 * Use this to populate START_BLOCKHEIGHT in .env after deploying the contract.
 *
 * Usage:
 *   bun run scripts/get-tip.ts
 */

const VIEM = "../packages/batcher/node_modules/viem";

const { createPublicClient, http } = await import(
  new URL(`${VIEM}/index.js`, import.meta.url).pathname
);
const { base } = await import(
  new URL(`${VIEM}/chains/index.js`, import.meta.url).pathname
);

// Use EVM_RPC_URL from .env if present, otherwise the public Base RPC.
const envPath = new URL("../.env", import.meta.url).pathname;
const envFile = await Bun.file(envPath).text().catch(() => "");
const rpcUrl =
  envFile.match(/^EVM_RPC_URL=(.+)$/m)?.[1]?.trim() ??
  "https://mainnet.base.org";

const client = createPublicClient({ chain: base, transport: http(rpcUrl) });
const block = await client.getBlock({ blockTag: "latest" });

console.log(`\n=== Base mainnet tip ===`);
console.log(`Block:   ${block.number}`);
console.log(`Hash:    ${block.hash}`);
console.log(`Time:    ${new Date(Number(block.timestamp) * 1000).toISOString()}`);
console.log(`RPC:     ${rpcUrl}`);
console.log(`
Set in .env:
  START_BLOCKHEIGHT=${block.number}
`);
