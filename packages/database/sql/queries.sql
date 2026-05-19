/* @name insertCanvas */
INSERT INTO canvases (owner, parent_id, paint_count, max_paints, block_height)
VALUES (:owner!, :parentId, :paintCount!, :maxPaints!, :blockHeight!)
RETURNING id;

/* @name insertPaint */
INSERT INTO paints (canvas_id, painter, color, paint_index, block_height)
VALUES (:canvasId!, :painter!, :color!, :paintIndex!, :blockHeight!)
RETURNING id;

/* @name incrementCanvasPaintCount */
UPDATE canvases
SET paint_count = paint_count + 1,
    filled = (paint_count + 1) >= max_paints
WHERE id = :canvasId!
RETURNING paint_count, filled, max_paints;

/* @name getCanvasById */
SELECT * FROM canvases WHERE id = :canvasId!;

/* @name getCanvasPaints */
SELECT * FROM paints WHERE canvas_id = :canvasId! ORDER BY paint_index ASC;

/* @name listUnfilledCanvases */
SELECT * FROM canvases WHERE filled = FALSE ORDER BY created_at DESC LIMIT :limit!;

/* @name listCanvasesByOwner */
SELECT * FROM canvases WHERE owner = :owner! ORDER BY created_at DESC LIMIT :limit!;

/* @name countCanvases */
SELECT COUNT(*)::INTEGER AS total FROM canvases;

/* @name upsertReward */
INSERT INTO rewards (owner, balance_wei, updated_block)
VALUES (:owner!, :balanceWei!, :blockHeight!)
ON CONFLICT (owner) DO UPDATE
  SET balance_wei = rewards.balance_wei + EXCLUDED.balance_wei,
      updated_block = EXCLUDED.updated_block;

/* @name getReward */
SELECT * FROM rewards WHERE owner = :owner!;
