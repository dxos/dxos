//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

/**
 * Adds `objectMeta.convergenceKey` — the caller-supplied domain identity duplicate detection groups
 * on — and its point-lookup index. A code migration for the same reason as 0002: databases in the
 * field may or may not have the column (0001 vintages differ), SQLite has no
 * `ADD COLUMN IF NOT EXISTS`, and an unconditional ALTER fails with "duplicate column".
 */
export const addConvergenceKey = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql.unsafe<{ name: string }>('PRAGMA table_info("objectMeta")');
  if (!columns.some((column) => column.name === 'convergenceKey')) {
    yield* sql.unsafe('ALTER TABLE objectMeta ADD COLUMN convergenceKey TEXT');
  }
  yield* sql.unsafe(
    'CREATE INDEX IF NOT EXISTS idx_object_index_convergenceKey ON objectMeta(spaceId, convergenceKey)',
  );
});
