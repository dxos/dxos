//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

/**
 * Adds `parentId`, `sourceId` and `targetId`: the bare entity id of the parent and relation
 * endpoints when they are local to the row's space, `NULL` otherwise. `parent`/`source`/`target`
 * hold full EID strings, so a join to `objectId` needs string concatenation on the indexed side,
 * which the `(spaceId, objectId)` index cannot serve; the query compiler joins through these
 * columns instead. A code migration for the same reason as 0002: SQLite has no
 * `ADD COLUMN IF NOT EXISTS`.
 */
const NORMALIZED_ID_COLUMNS = ['parentId', 'sourceId', 'targetId'] as const;

export const addNormalizedIds = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql.unsafe<{ name: string }>('PRAGMA table_info("objectMeta")');
  const present = new Set(columns.map((column) => column.name));
  for (const name of NORMALIZED_ID_COLUMNS) {
    if (!present.has(name)) {
      yield* sql.unsafe(`ALTER TABLE objectMeta ADD COLUMN ${name} TEXT`);
    }
    yield* sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_object_index_${name} ON objectMeta(spaceId, ${name})`);
  }
});
