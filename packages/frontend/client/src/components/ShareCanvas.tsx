import { shareCanvas } from "../miniapp.ts";

export function ShareCanvas({ canvasId }: { canvasId: number }) {
  return (
    <button className="secondary" onClick={() => void shareCanvas(canvasId)}>
      Share as cast
    </button>
  );
}
