import { Type } from "@sinclair/typebox";
import type { GrammarDefinition } from "@effectstream/concise";

/**
 * Grammar for the L2 contract (game inputs submitted via effectstreamSubmitGameInput).
 *
 * Wire format submitted to the L2 contract is a JSON array:
 *   ["fork", copyFromCanvasId]              — copyFromCanvasId == 0 mints a seed canvas
 *   ["paint", canvasId, "#rrggbb"]          — paint a pixel on canvasId
 */
export const effectstreamL2Grammar = {
  fork: [["copyFromCanvasId", Type.Integer({ minimum: 0 })]],
  paint: [
    ["canvasId", Type.Integer({ minimum: 1 })],
    ["color", Type.String({ pattern: "^#[0-9a-fA-F]{6}$" })],
  ],
} as const satisfies GrammarDefinition;

export const grammar = {
  ...effectstreamL2Grammar,
} as const satisfies GrammarDefinition;
