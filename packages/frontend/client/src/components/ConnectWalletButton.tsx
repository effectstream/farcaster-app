import { useWallet } from "../hooks/useWallet.ts";

export function ConnectWalletButton() {
  const { address, connecting, error, connect } = useWallet();

  if (address) {
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
    return (
      <button
        className="secondary"
        style={{ padding: "0.35em 0.7em", fontSize: "0.85em" }}
        disabled
      >
        {short}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        className="secondary"
        style={{ padding: "0.35em 0.7em", fontSize: "0.85em" }}
        onClick={() => void connect()}
        disabled={connecting}
      >
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
      {error && <span className="error" style={{ fontSize: "0.75em" }}>{error}</span>}
    </div>
  );
}
