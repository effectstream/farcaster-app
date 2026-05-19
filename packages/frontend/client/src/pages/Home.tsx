import { Link } from "react-router-dom";
import { CanvasView } from "../components/CanvasView.tsx";
import { ForkButton } from "../components/ForkButton.tsx";
import { RewardsPanel } from "../components/RewardsPanel.tsx";
import { useCanvas, useCanvasList } from "../hooks/useCanvas.ts";

export function Home() {
  const { canvases, loading, error, refresh } = useCanvasList({ pollMs: 5000 });

  return (
    <>
      <RewardsPanel />

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Start fresh</strong>
          <ForkButton canvasId={0} seed onCreated={refresh} />
        </div>
        <p className="muted">Mint a brand new seed canvas with 3 random colors.</p>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Open canvases ({canvases.length})</strong>
          <button className="secondary" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
        {loading && <p className="muted">Loading…</p>}
        {error && <p className="error">{error}</p>}
        <div className="gallery" style={{ marginTop: "0.75rem" }}>
          {canvases.map((c) => (
            <CanvasGalleryItem key={c.id} canvasId={c.id} paintCount={c.paint_count} />
          ))}
        </div>
      </div>
    </>
  );
}

function CanvasGalleryItem({ canvasId, paintCount }: { canvasId: number; paintCount: number }) {
  const { paints } = useCanvas(canvasId);
  return (
    <Link to={`/canvas/${canvasId}`}>
      <CanvasView paints={paints} />
      <div className="muted" style={{ marginTop: 4, textAlign: "center" }}>
        #{canvasId} · {paintCount}/25
      </div>
    </Link>
  );
}
