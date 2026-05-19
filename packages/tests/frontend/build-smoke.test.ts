import path from "node:path";
import { assert } from "../helpers.ts";

export async function frontendBuildTest(): Promise<void> {
  const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");

  await assert("Vite build succeeds for frontend", async () => {
    const proc = Bun.spawn(
      ["bun", "run", "--filter", "@farcaster-canvas/frontend", "build"],
      { cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
    );
    const exit = await proc.exited;
    return exit === 0;
  });
}
