import { Client } from "pg";
import { assertSQL } from "../helpers.ts";

const API = process.env.GAME_NODE_URI ?? "http://localhost:3333";
const BATCHER = process.env.BATCHER_URI ?? "http://localhost:3334";

async function submitToBatcher(input: unknown[]) {
  // The batcher exposes an HTTP submission endpoint; signature is omitted in
  // dev because the batcher's default namespace accepts unsigned inputs locally.
  await fetch(`${BATCHER}/submit_user_input`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
}

export async function forkTest(db: Client): Promise<void> {
  // Seed a new canvas (copyFromCanvasId = 0)
  await submitToBatcher(["fork", 0]);
  await assertSQL(
    "fork(0) creates a seed canvas with 3 paints",
    db,
    "SELECT c.id, c.paint_count FROM canvases c WHERE c.parent_id IS NULL ORDER BY c.id DESC LIMIT 1",
    (res) => res.rows.length === 1,
    (res) => (res.rows[0]?.paint_count as number) === 3,
  );

  // Fork that seed (copyFrom > 0)
  await submitToBatcher(["fork", 1]);
  await assertSQL(
    "fork(1) creates a child with parent_id = 1 and cloned paints",
    db,
    "SELECT id, parent_id, paint_count FROM canvases WHERE parent_id = 1 ORDER BY id DESC LIMIT 1",
    (res) => res.rows.length === 1,
    (res) => (res.rows[0]?.paint_count as number) >= 3,
  );

  // Reach the API directly
  const apiRes = await fetch(`${API}/api/canvases`);
  if (!apiRes.ok) throw new Error(`/api/canvases returned ${apiRes.status}`);
}
