import { useState } from "react";
import { useWallet } from "../hooks/useWallet.ts";

const PALETTE = [
  "#ff595e",
  "#ffca3a",
  "#8ac926",
  "#1982c4",
  "#6a4c93",
  "#ff924c",
  "#43aa8b",
  "#f72585",
];

interface Props {
  canvasId: number;
  disabled?: boolean;
  onPainted?: () => void;
}

export function PaintControls({ canvasId, disabled, onPainted }: Props) {
  const { address, connecting, error, connect, submit } = useWallet();
  const [color, setColor] = useState(PALETTE[0]!);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const paint = async () => {
    setBusy(true);
    setLocalError(null);
    try {
      await submit(["paint", canvasId, color]);
      onPainted?.();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Paint failed");
    } finally {
      setBusy(false);
    }
  };

  if (!address) {
    return (
      <div className="card">
        <button onClick={() => void connect()} disabled={connecting}>
          {connecting ? "Connecting…" : "Connect wallet to paint"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row">
        <span className="muted">Pick a color</span>
      </div>
      <div className="palette">
        {PALETTE.map((c) => (
          <div
            key={c}
            className={`swatch${c === color ? " selected" : ""}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            role="button"
            aria-label={`select ${c}`}
          />
        ))}
      </div>
      <div className="row" style={{ marginTop: "0.75rem" }}>
        <button onClick={() => void paint()} disabled={disabled || busy}>
          {busy ? "Painting…" : "Paint pixel"}
        </button>
        <span className="muted">~25,610 gwei + gas</span>
      </div>
      {localError && <p className="error">{localError}</p>}
    </div>
  );
}
