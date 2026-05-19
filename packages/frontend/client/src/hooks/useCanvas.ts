import { useCallback, useEffect, useState } from "react";
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
  notFound: boolean;
  refresh: () => Promise<void>;
}

export function useCanvas(id: number | undefined, opts?: { pollMs?: number }): CanvasState {
  const pollMs = opts?.pollMs;
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [paints, setPaints] = useState<Paint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${apiBase}/canvas/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        setCanvas(null);
        setPaints([]);
        setError(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCanvas(data.canvas);
      setPaints(data.paints);
      setError(null);
      setNotFound(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!id || !pollMs) return;
    const handle = setInterval(() => {
      void refresh();
    }, pollMs);
    return () => clearInterval(handle);
  }, [id, pollMs, refresh]);

  return { canvas, paints, loading, error, refresh };
}

export interface CanvasList {
  canvases: Canvas[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCanvasList(opts?: { pollMs?: number }): CanvasList {
  const pollMs = opts?.pollMs;
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
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

  useEffect(() => {
    if (!pollMs) return;
    const handle = setInterval(() => {
      void refresh();
    }, pollMs);
    return () => clearInterval(handle);
  }, [pollMs, refresh]);

  return { canvases, total, loading, error, refresh };
}
