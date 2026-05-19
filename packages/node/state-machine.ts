import { Stm } from "@effectstream/sm";
import type { BaseStfInput } from "@effectstream/sm";
import type { StartConfigGameStateTransitions } from "@effectstream/runtime";
import { World } from "@effectstream/coroutine";
import {
  getCanvasById,
  getCanvasPaints,
  incrementCanvasPaintCount,
  insertCanvas,
  insertPaint,
} from "@farcaster-canvas/database";
import { AppEvents, CANVAS_MAX_PAINTS, SEED_PAINT_COUNT } from "@farcaster-canvas/shared";
import { grammar } from "./grammar.ts";

const SEED_PALETTE = [
  "#ff595e",
  "#ffca3a",
  "#8ac926",
  "#1982c4",
  "#6a4c93",
  "#ff924c",
  "#43aa8b",
  "#f72585",
];

const stm = new Stm<typeof grammar, {}>(grammar);

/* ------------------------------------------------------------- fork ----- */
stm.addStateTransition("fork", function* (data) {
  const { parsedInput, signerAddress, blockHeight, randomGenerator } = data;
  const owner = signerAddress ?? "0x0";
  const copyFrom = parsedInput.copyFromCanvasId;

  if (copyFrom === 0) {
    // Seed canvas: 3 random colors deterministically generated from RNG.
    const [{ id: newId }] = yield* World.resolve(insertCanvas, {
      owner,
      parentId: null,
      paintCount: SEED_PAINT_COUNT,
      maxPaints: CANVAS_MAX_PAINTS,
      blockHeight,
    });

    for (let i = 0; i < SEED_PAINT_COUNT; i++) {
      const color = randomGenerator.nextArrayItem(SEED_PALETTE);
      yield* World.resolve(insertPaint, {
        canvasId: newId,
        painter: owner,
        color,
        paintIndex: i,
        blockHeight,
      });
    }

    data.emit(AppEvents.CanvasCreated, { canvasId: newId, owner, parentId: 0 });
    return;
  }

  // Fork existing canvas: clone all paints, set parent_id.
  const [parent] = yield* World.resolve(getCanvasById, { canvasId: copyFrom });
  if (!parent) return;

  const parentPaints = yield* World.resolve(getCanvasPaints, { canvasId: copyFrom });

  const [{ id: newId }] = yield* World.resolve(insertCanvas, {
    owner,
    parentId: copyFrom,
    // Use the parent's stored paint_count (next paint index), not the row count —
    // they only match for contiguous paints, and a fork into a non-contiguous
    // parent would collide with a cloned row on the first user paint.
    paintCount: parent.paint_count,
    maxPaints: CANVAS_MAX_PAINTS,
    blockHeight,
  });

  for (const p of parentPaints) {
    yield* World.resolve(insertPaint, {
      canvasId: newId,
      painter: p.painter,
      color: p.color,
      paintIndex: p.paint_index,
      blockHeight,
    });
  }

  data.emit(AppEvents.CanvasCreated, { canvasId: newId, owner, parentId: copyFrom });
});

/* ------------------------------------------------------------- paint ---- */
stm.addStateTransition("paint", function* (data) {
  const { parsedInput, signerAddress, blockHeight } = data;
  const painter = signerAddress ?? "0x0";
  const { canvasId, color } = parsedInput;

  const [canvas] = yield* World.resolve(getCanvasById, { canvasId });
  if (!canvas || canvas.filled) return;

  yield* World.resolve(insertPaint, {
    canvasId,
    painter,
    color,
    paintIndex: canvas.paint_count,
    blockHeight,
  });

  const [updated] = yield* World.resolve(incrementCanvasPaintCount, { canvasId });
  if (!updated) return;

  data.emit(AppEvents.PaintApplied, {
    canvasId,
    painter,
    paintIndex: canvas.paint_count,
    color,
  });

  if (updated.filled) {
    data.emit(AppEvents.CanvasFilled, { canvasId });
  }
});

export const gameStateTransitions: StartConfigGameStateTransitions = function* (
  _blockHeight: number,
  input: BaseStfInput,
) {
  yield* stm.processInput(input);
};
