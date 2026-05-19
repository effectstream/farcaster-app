import { Link } from "react-router-dom";
import { CanvasView } from "../components/CanvasView.tsx";
import { ForkButton } from "../components/ForkButton.tsx";
import { RewardsPanel } from "../components/RewardsPanel.tsx";
import { useCanvasList } from "../hooks/useCanvas.ts";

export function Home() {
  const { canvases, loading, error, refresh } = useCanvasList();

  return (
    <>
      <RewardsPanel />

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Start fresh</strong>
          <ForkButton canvasId={0} seed />
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
  // Lazy-loaded preview: just the colors we already know about would require
  // a paints fetch; instead show a placeholder grid and let the canvas page
  // do the heavy lifting.
  return (
    <Link to={`/canvas/${canvasId}`}>
      <CanvasView paints={[]} />
      <div className="muted" style={{ marginTop: 4, textAlign: "center" }}>
        #{canvasId} · {paintCount}/25
      </div>
    </Link>
  );
}
