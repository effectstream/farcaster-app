import { useCallback, useEffect, useState } from "react";
import { EventManager } from "@effectstream/event-client";
import { AppEvents } from "@farcaster-canvas/shared";
import { apiBase } from "../effectstream-config.ts";

export interface Canvas {
  id: number;
  owner: string;
  parent_id: number | null;
  paint_count: number;
  max_paints: number;
  filled: boolean;
  block_height: number;
}

export interface Paint {
  id: number;
  canvas_id: number;
  painter: string;
  color: string;
  paint_index: number;
}

export interface CanvasState {
  canvas: Canvas | null;
  paints: Paint[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCanvas(id: number | undefined): CanvasState {
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [paints, setPaints] = useState<Paint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/canvas/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCanvas(data.canvas);
      setPaints(data.paints);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live updates: subscribe to PaintApplied and CanvasFilled for this canvas.
  useEffect(() => {
    if (!id) return;
    let painted: symbol | undefined;
    let filled: symbol | undefined;

    (async () => {
      try {
        painted = await EventManager.Instance.subscribe(
          {
            topic: AppEvents.PaintApplied,
            filter: { canvasId: id, painter: undefined, blockHeight: undefined },
          },
          () => {
            void refresh();
          },
        );
        filled = await EventManager.Instance.subscribe(
          {
            topic: AppEvents.CanvasFilled,
            filter: { canvasId: id, blockHeight: undefined },
          },
          () => {
            void refresh();
          },
        );
      } catch (err) {
        console.warn("[useCanvas] event subscription failed:", err);
      }
    })();

    return () => {
      if (painted) void EventManager.Instance.unsubscribe(painted);
      if (filled) void EventManager.Instance.unsubscribe(filled);
    };
  }, [id, refresh]);

  return { canvas, paints, loading, error, refresh };
}

export interface CanvasList {
  canvases: Canvas[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCanvasList(): CanvasList {
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/canvases?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCanvases(data.canvases);
      setTotal(data.total ?? data.canvases.length);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { canvases, total, loading, error, refresh };
}
