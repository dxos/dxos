//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

/**
 * Adds `propPathNormalized`: the escaped property path with array-index segments removed, so an
 * incoming-reference lookup by property is an indexed equality rather than a per-row path walk.
 * Rows written before this column existed hold `NULL`; the reverse-reference index name is bumped
 * alongside so every object is re-presented and the column filled. A code migration because
 * SQLite has no `ADD COLUMN IF NOT EXISTS`.
 */
export const addPropPathNormalized = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql.unsafe<{ name: string }>('PRAGMA table_info("reverseRef")');
  if (!columns.some((column) => column.name === 'propPathNormalized')) {
    yield* sql.unsafe('ALTER TABLE reverseRef ADD COLUMN propPathNormalized TEXT');
  }
  yield* sql.unsafe(
    'CREATE INDEX IF NOT EXISTS idx_reverse_ref_target_path ON reverseRef(targetDXN, propPathNormalized)',
  );
});
