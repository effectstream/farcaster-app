-- Collaborative canvas game schema.
-- A canvas is either a "seed" (parent_id IS NULL, generated with 3 random colors)
-- or a "fork" (parent_id references the canvas its paints were cloned from).

CREATE TABLE canvases (
  id           SERIAL PRIMARY KEY,
  owner        TEXT     NOT NULL,
  parent_id    INTEGER  NULL REFERENCES canvases(id),
  paint_count  INTEGER  NOT NULL DEFAULT 0,
  max_paints   INTEGER  NOT NULL DEFAULT 25,
  filled       BOOLEAN  NOT NULL DEFAULT FALSE,
  block_height INTEGER  NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX canvases_owner_idx       ON canvases (owner);
CREATE INDEX canvases_parent_idx      ON canvases (parent_id);
CREATE INDEX canvases_unfilled_idx    ON canvases (filled) WHERE filled = FALSE;

CREATE TABLE paints (
  id           SERIAL PRIMARY KEY,
  canvas_id    INTEGER  NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  painter      TEXT     NOT NULL,
  color        TEXT     NOT NULL,
  paint_index  INTEGER  NOT NULL,
  block_height INTEGER  NOT NULL,
  UNIQUE (canvas_id, paint_index)
);

CREATE INDEX paints_canvas_idx  ON paints (canvas_id);
CREATE INDEX paints_painter_idx ON paints (painter);

-- Off-chain mirror of accrued reward balances for fast UI lookups.
-- The authoritative source is the CanvasGame contract's withdraw() balances.
CREATE TABLE rewards (
  owner         TEXT     PRIMARY KEY,
  balance_wei   NUMERIC(78, 0) NOT NULL DEFAULT 0,
  updated_block INTEGER  NOT NULL DEFAULT 0
);
