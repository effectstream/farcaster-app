/**
 * Wallet helper for deploy/batcher key management.
 *
 * Modes:
 *   read (default) — derives address from EVM_PRIVATE_KEY in .env and prints balance
 *   new            — generates a fresh private key and prints its details
 *
 * Usage:
 *   bun run scripts/gen-wallet.ts        # read mode
 *   bun run scripts/gen-wallet.ts new    # generate new wallet
 */

const VIEM = "../packages/batcher/node_modules/viem";

const { privateKeyToAccount, generatePrivateKey } = await import(
  new URL(`${VIEM}/accounts/index.js`, import.meta.url).pathname
);
const { createPublicClient, http, formatEther } = await import(
  new URL(`${VIEM}/index.js`, import.meta.url).pathname
);
const { base } = await import(
  new URL(`${VIEM}/chains/index.js`, import.meta.url).pathname
);

const mode = process.argv[2] ?? "read";

if (mode === "new") {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  console.log("\n=== New wallet ===");
  console.log(`Address:     ${account.address}`);
  console.log(`Private key: ${privateKey}`);
  console.log(`
Next steps:
  1. Save the private key in a password manager — you won't see it again.
  2. Fund ${account.address} with Base ETH (deploy ~0.01 ETH, batcher 0.1–0.5 ETH).
  3. Set in .env:
       EVM_PRIVATE_KEY=${privateKey}
`);
} else if (mode === "read") {
  // Parse .env from project root (two levels up from scripts/)
  const envPath = new URL("../.env", import.meta.url).pathname;
  const envFile = await Bun.file(envPath).text().catch(() => {
    console.error("No .env file found. Copy .env.mainnet.example → .env first.");
    process.exit(1);
  });

  const get = (key: string) =>
    envFile.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim();

  const privateKey = get("EVM_PRIVATE_KEY");
  if (!privateKey) {
    console.error("EVM_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  const rpcUrl = get("EVM_RPC_URL") ?? get("CHAIN_URI") ?? "https://mainnet.base.org";
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const client = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const balanceWei = await client.getBalance({ address: account.address });
  const balanceEth = formatEther(balanceWei);

  console.log("\n=== Wallet (from .env) ===");
  console.log(`Address:     ${account.address}`);
  console.log(`Balance:     ${balanceEth} ETH`);
  console.log(`RPC:         ${rpcUrl}`);
  console.log();
} else {
  console.error(`Unknown mode "${mode}". Use: read | new`);
  process.exit(1);
}
