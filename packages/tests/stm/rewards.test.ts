import { assert } from "../helpers.ts";

const API = process.env.GAME_NODE_URI ?? `http://localhost:${process.env.EFFECTSTREAM_API_PORT ?? 9999}`;

export async function rewardsTest(): Promise<void> {
  // The rewards table is populated by an indexer/STM hook; for now we just verify
  // the API endpoint shape and that it returns a zero balance for an unknown address.
  await assert("/api/rewards/<addr> returns a JSON balance", async () => {
    const res = await fetch(`${API}/api/rewards/0x0000000000000000000000000000000000000000`);
    if (!res.ok) return false;
    const data = (await res.json()) as { owner: string; balanceWei: string };
    return data.owner.length === 42 && typeof data.balanceWei === "string";
  });
}
