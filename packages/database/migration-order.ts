import type { DBMigrations } from "@effectstream/runtime";
import initSql from "./migrations/000-init.sql" with { type: "text" };

export const migrationTable: DBMigrations[] = [
  // blockHeight MUST be explicit. With EFFECTSTREAM_COALESCE_EMPTY_BLOCKS=true,
  // the merge only treats a block as a non-coalescable boundary if its height is
  // in mergeCoalescingBoundaries.migrationBlockHeights — and initMergeCoalescingBoundaries
  // only registers migrations that declare blockHeight. A migration without one
  // (which getMigrationsForBlockHeight defaults to block 1) gets coalesced over,
  // so the schema is never created and no block is ever applied. Pin it to block 1.
  { name: "000-init.sql", blockHeight: 1, sql: initSql },
];
