import type { Paint } from "../hooks/useCanvas.ts";
import { CANVAS_MAX_PAINTS } from "@farcaster-canvas/shared";

interface Props {
  paints: Paint[];
  size?: number;
  nextPaintIndex?: number;
}

const COLS = 5;

export function CanvasView({ paints, size = CANVAS_MAX_PAINTS, nextPaintIndex }: Props) {
  // Render a 5x5 grid; each cell shows the color at that paint_index, or empty.
  const cells = Array.from({ length: size }, (_, i) => {
    const p = paints.find((x) => x.paint_index === i);
    return p?.color ?? null;
  });

  return (
    <div className="canvas-grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
      {cells.map((c, i) => {
        const isNext = i === nextPaintIndex;
        return (
          <div
            key={i}
            className={`canvas-cell${isNext ? " next" : ""}`}
            style={c ? { background: c } : undefined}
            aria-label={
              isNext ? `pixel ${i} next` : c ? `pixel ${i} ${c}` : `pixel ${i} empty`
            }
          />
        );
      })}
    </div>
  );
}
