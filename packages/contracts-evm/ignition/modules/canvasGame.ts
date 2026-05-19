import { buildModule } from "@nomicfoundation/ignition-core";

export default buildModule("CanvasGameModule", (m) => {
  // Owner defaults to the deployer; the EffectstreamL2Contract base fee starts at 0.
  const owner = m.getParameter("owner", m.getAccount(0));
  const fee = m.getParameter<bigint>("fee", 0n);

  const canvasGame = m.contract("CanvasGame", [owner, fee]);
  return { canvasGame };
});
