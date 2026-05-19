import { Client } from "pg";
import { chainReadyTest } from "./infra/chain-ready.test.ts";
import { forkTest } from "./stm/fork.test.ts";
import { paintTest } from "./stm/paint.test.ts";
import { rewardsTest } from "./stm/rewards.test.ts";
import { frontendBuildTest } from "./frontend/build-smoke.test.ts";
import { summarize } from "./helpers.ts";

const DB_HOST = process.env.DB_HOST ?? "localhost";
const DB_PORT = Number(process.env.DB_PORT ?? 5432);
const DB_NAME = process.env.DB_NAME ?? "postgres";
const DB_USER = process.env.DB_USER ?? "postgres";
const DB_PW = process.env.DB_PW ?? "postgres";

async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PW,
  });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

console.log("\n=== Phase A: Infrastructure ===");
await chainReadyTest();

console.log("\n=== Phase B: State Machine + DB + API ===");
await withDb(async (db) => {
  await forkTest(db);
  await paintTest(db);
});
await rewardsTest();

console.log("\n=== Phase C: Frontend ===");
await frontendBuildTest();

summarize();
