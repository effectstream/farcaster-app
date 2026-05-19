import { Navigate, useParams } from "react-router-dom";
import { CanvasView } from "../components/CanvasView.tsx";
import { ForkButton } from "../components/ForkButton.tsx";
import { PaintControls } from "../components/PaintControls.tsx";
import { ShareCanvas } from "../components/ShareCanvas.tsx";
import { useCanvas } from "../hooks/useCanvas.ts";

export function CanvasPage() {
  const { id } = useParams<{ id: string }>();
  const canvasId = Number(id);
  const { canvas, paints, loading, error, notFound, refresh } = useCanvas(canvasId, {
    pollMs: 2500,
  });

  if (notFound) return <Navigate to="/" replace />;
  if (loading) return <p className="muted">Loading canvas #{canvasId}…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!canvas) return <p className="error">Canvas #{canvasId} not found.</p>;

  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Canvas #{canvas.id}</strong>
          <span className="muted">
            {canvas.paint_count}/{canvas.max_paints}
            {canvas.filled ? " · full" : ""}
          </span>
        </div>
        <p className="muted">
          Owner: {canvas.owner.slice(0, 6)}…{canvas.owner.slice(-4)}
          {canvas.parent_id ? ` · forked from #${canvas.parent_id}` : " · seed"}
        </p>
        <CanvasView
          paints={paints}
          nextPaintIndex={canvas.filled ? undefined : canvas.paint_count}
        />
      </div>

      {!canvas.filled && (
        <PaintControls
          canvasId={canvas.id}
          nextPaintIndex={canvas.paint_count}
          onPainted={() => void refresh()}
        />
      )}

      <div className="card">
        <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          <ForkButton canvasId={canvas.id} />
          <ShareCanvas canvasId={canvas.id} />
        </div>
      </div>
    </>
  );
}
