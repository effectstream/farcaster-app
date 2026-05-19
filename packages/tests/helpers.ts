import type { Client } from "pg";

export const counters = { pass: 0, fail: 0 };

export async function assert(name: string, check: () => Promise<boolean>): Promise<void> {
  process.stdout.write(`  [TEST] ${name}…`);
  try {
    const ok = await check();
    if (ok) {
      console.log(" PASS");
      counters.pass++;
    } else {
      console.log(" FAIL");
      counters.fail++;
    }
  } catch (err) {
    console.log(" ERROR:", err instanceof Error ? err.message : err);
    counters.fail++;
  }
}

export async function assertSQL<T extends Record<string, unknown>>(
  name: string,
  db: Client,
  query: string,
  waitUntil: (res: { rows: T[] }) => boolean,
  check: (res: { rows: T[] }) => boolean,
  timeoutMs = 20_000,
): Promise<void> {
  process.stdout.write(`  [TEST] ${name}…`);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = (await db.query(query)) as { rows: T[] };
    if (waitUntil(res) && check(res)) {
      console.log(" PASS");
      counters.pass++;
      return;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(" TIMEOUT");
  counters.fail++;
}

export function summarize(): never | void {
  console.log(`\n[RESULTS] ${counters.pass} passed, ${counters.fail} failed`);
  if (counters.fail > 0) process.exit(1);
}
