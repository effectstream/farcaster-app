import { Client } from "pg";
import { assertSQL } from "../helpers.ts";

const BATCHER = process.env.BATCHER_URI ?? "http://localhost:3334";

async function submit(input: unknown[]) {
  await fetch(`${BATCHER}/submit_user_input`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
}

export async function paintTest(db: Client): Promise<void> {
  // Paint a pixel on canvas 1 (assumes forkTest ran first and created at least one canvas).
  await submit(["paint", 1, "#1982c4"]);
  await assertSQL(
    "paint inserts a new row into paints",
    db,
    "SELECT * FROM paints WHERE canvas_id = 1 AND color = '#1982c4' ORDER BY paint_index DESC LIMIT 1",
    (res) => res.rows.length === 1,
    (res) => typeof res.rows[0]?.painter === "string",
  );

  await assertSQL(
    "canvases.paint_count incremented",
    db,
    "SELECT paint_count FROM canvases WHERE id = 1",
    (res) => res.rows.length === 1,
    (res) => (res.rows[0]?.paint_count as number) >= 4,
  );
}
