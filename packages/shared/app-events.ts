import { Type } from "@sinclair/typebox";
import { genEvent, registerEvents } from "@effectstream/event-client";

export const AppEvents = registerEvents({
  CanvasCreated: genEvent({
    name: "CanvasCreated",
    fields: [
      { name: "canvasId", type: Type.Integer(), indexed: true },
      { name: "owner", type: Type.String(), indexed: true },
      { name: "parentId", type: Type.Integer() },
    ],
  }),
  PaintApplied: genEvent({
    name: "PaintApplied",
    fields: [
      { name: "canvasId", type: Type.Integer(), indexed: true },
      { name: "painter", type: Type.String(), indexed: true },
      { name: "paintIndex", type: Type.Integer() },
      { name: "color", type: Type.String() },
    ],
  }),
  CanvasFilled: genEvent({
    name: "CanvasFilled",
    fields: [{ name: "canvasId", type: Type.Integer(), indexed: true }],
  }),
});
