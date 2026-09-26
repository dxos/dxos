//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

/**
 * Adds `objectMeta.annotations`, the JSON of `meta.annotations` that annotation filters compile against.
 * A code migration for the same reason as 0007: SQLite has no `ADD COLUMN IF NOT EXISTS`.
 * Existing rows are filled by the reindex that tracker migration 0008 forces.
 */
export const addAnnotations = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql.unsafe<{ name: string }>('PRAGMA table_info("objectMeta")');
  if (!columns.some((column) => column.name === 'annotations')) {
    yield* sql.unsafe('ALTER TABLE objectMeta ADD COLUMN annotations TEXT');
  }
});
