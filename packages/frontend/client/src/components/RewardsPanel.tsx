import { useEffect, useState } from "react";
import { apiBase } from "../effectstream-config.ts";
import { useWallet } from "../hooks/useWallet.ts";

export function RewardsPanel() {
  const { address } = useWallet();
  const [balance, setBalance] = useState<string>("0");

  useEffect(() => {
    if (!address) return;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/rewards/${address}`);
        const data = await res.json();
        setBalance(data.balanceWei ?? "0");
      } catch {
        setBalance("0");
      }
    })();
  }, [address]);

  if (!address) return null;

  const eth = Number(balance) / 1e18;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>Pending rewards</strong>
        <span className="muted">{eth.toFixed(6)} ETH</span>
      </div>
      <p className="muted">Withdraw from CanvasGame.withdraw() once you have a balance.</p>
    </div>
  );
}
