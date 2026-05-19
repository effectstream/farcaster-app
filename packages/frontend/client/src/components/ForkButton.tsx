import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet.ts";
import { shareCanvas } from "../miniapp.ts";

interface Props {
  canvasId: number;
  // When true the button creates a seed canvas (copyFromCanvasId = 0).
  seed?: boolean;
}

export function ForkButton({ canvasId, seed }: Props) {
  const { address, connect, submit } = useWallet();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!address) await connect();
      await submit(["fork", seed ? 0 : canvasId]);
      // Optimistic: open the home page to see new canvas list.
      navigate("/");
      // Compose a share cast — the latest canvas id is whatever the user just made.
      // Use canvasId here as a soft hint; on the canvas page it will refresh from API.
      void shareCanvas(canvasId, { forked: !seed });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fork failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="secondary" onClick={() => void run()} disabled={busy}>
        {busy ? "…" : seed ? "Start new seed canvas" : "Fork to my timeline"}
      </button>
      {error && <p className="error">{error}</p>}
    </>
  );
}
