import { Client } from "pg";
import { assertSQL } from "../helpers.ts";

const API = process.env.GAME_NODE_URI ?? `http://localhost:${process.env.EFFECTSTREAM_API_PORT ?? 9999}`;
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
    "fork(0) creates a seed canvas with paint_count=3 and 3 paint rows at indexes 0/1/2",
    db,
    "SELECT c.paint_count, (SELECT COUNT(*) FROM paints p WHERE p.canvas_id = c.id)::int AS row_count, (SELECT COALESCE(MAX(paint_index), -1) FROM paints WHERE canvas_id = c.id)::int AS max_index FROM canvases c WHERE c.parent_id IS NULL ORDER BY c.id DESC LIMIT 1",
    (res) => res.rows.length === 1,
    (res) =>
      (res.rows[0]?.paint_count as number) === 3 &&
      (res.rows[0]?.row_count as number) === 3 &&
      (res.rows[0]?.max_index as number) === 2,
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

  // Paint on the seed, then fork it again, then paint the new fork.
  // Regression: forking after the seed has been painted on must persist
  // the next paint index correctly so the fork's first paint doesn't collide
  // with a cloned row.
  await submitToBatcher(["paint", 1, "#ff595e"]);
  await assertSQL(
    "paint(1) advances seed paint_count past the seed paints",
    db,
    "SELECT paint_count FROM canvases WHERE id = 1",
    (res) => res.rows.length === 1,
    (res) => (res.rows[0]?.paint_count as number) >= 4,
  );

  await submitToBatcher(["fork", 1]);
  await assertSQL(
    "fork(1) after a paint sets paint_count from parent's stored value",
    db,
    "SELECT c.id, c.paint_count, (SELECT COUNT(*) FROM paints WHERE canvas_id = c.id)::int AS row_count FROM canvases c WHERE parent_id = 1 ORDER BY id DESC LIMIT 1",
    (res) => res.rows.length === 1,
    (res) => (res.rows[0]?.paint_count as number) === (res.rows[0]?.row_count as number),
  );

  // Find the latest fork and paint it — this is the action that previously
  // crashed with "current transaction is aborted" (25P02) on a unique
  // constraint violation against (canvas_id, paint_index).
  const latestFork = await db.query<{ id: number; paint_count: number }>(
    "SELECT id, paint_count FROM canvases WHERE parent_id = 1 ORDER BY id DESC LIMIT 1",
  );
  const forkId = latestFork.rows[0]!.id;
  const expectedNextIndex = latestFork.rows[0]!.paint_count;
  await submitToBatcher(["paint", forkId, "#1982c4"]);
  await assertSQL(
    "paint on a forked-after-paint canvas succeeds (no unique-index collision)",
    db,
    `SELECT paint_index FROM paints WHERE canvas_id = ${forkId} ORDER BY paint_index DESC LIMIT 1`,
    (res) => res.rows.length === 1,
    (res) => (res.rows[0]?.paint_index as number) === expectedNextIndex,
  );

  // Reach the API directly
  const apiRes = await fetch(`${API}/api/canvases`);
  if (!apiRes.ok) throw new Error(`/api/canvases returned ${apiRes.status}`);
}
