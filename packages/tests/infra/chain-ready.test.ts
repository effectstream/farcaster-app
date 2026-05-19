import { assert } from "../helpers.ts";

const RPC = process.env.CHAIN_URI ?? "http://localhost:8545";

export async function chainReadyTest(): Promise<void> {
  await assert("EVM chain responds on " + RPC, async () => {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
    });
    const json = (await res.json()) as { result: string };
    return parseInt(json.result, 16) === Number(process.env.CHAIN_ID ?? 31337);
  });

  await assert("Node API health check", async () => {
    const url = (process.env.GAME_NODE_URI ?? "http://localhost:9999") + "/api/health";
    const res = await fetch(url);
    if (!res.ok) return false;
    const data = (await res.json()) as { ok: boolean };
    return data.ok === true;
  });

  await assert("Batcher port is open", async () => {
    const port = Number(process.env.BATCHER_PORT ?? 3334);
    try {
      const res = await fetch(`http://localhost:${port}/`, { method: "GET" });
      // 200 / 404 both indicate something is listening; only a connection error fails.
      return res.status < 500;
    } catch {
      return false;
    }
  });
}
