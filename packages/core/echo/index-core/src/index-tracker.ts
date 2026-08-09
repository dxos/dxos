//
// Copyright 2026 DXOS.org
//

import * as Migrator from '@effect/sql/Migrator';
import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { SpaceId } from '@dxos/keys';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/tracker';

export const IndexCursor = Schema.Struct({
  /**
   * Name of the index owning this cursor.
   */
  indexName: Schema.String,
  /**
   * Space id.
   */
  spaceId: Schema.NullOr(SpaceId),
  /**
   * Source name.
   * 'automerge' / 'queue' / 'index' (for secondary indexes)
   */
  sourceName: Schema.String,
  /**
   * Document id or queue id.
   * doc_id, queue_id, '' <empty string> (if indexing entire namespace)
   */
  resourceId: Schema.NullOr(Schema.String),
  /**
   * Heads, queue position, version.
   */
  cursor: Schema.Union(Schema.Number, Schema.String),
});
export interface IndexCursor extends Schema.Schema.Type<typeof IndexCursor> {}

export class IndexTracker {
  /**
   * Applies any migrations this database has not recorded yet.
   *
   * `SqlTransaction.clientLayer` is provided because the migrator wraps its work in the client's
   * `withTransaction`, which emits `BEGIN` / `COMMIT` — rejected in workerd.
   */
  migrate = Effect.fn('IndexTracker.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      Effect.provide(SqlTransaction.clientLayer),
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
    ),
  );

  queryCursors = Effect.fn('IndexTracker.queryCursors')(
    (
      query: Pick<IndexCursor, 'indexName'> & Partial<Pick<IndexCursor, 'sourceName' | 'resourceId' | 'spaceId'>>,
    ): Effect.Effect<IndexCursor[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        const spaceIdParam = query.spaceId === undefined ? null : (query.spaceId ?? '');
        const sourceNameParam = query.sourceName === undefined ? null : query.sourceName;
        const resourceIdParam = query.resourceId === undefined ? null : (query.resourceId ?? '');

        const rows = yield* sql<IndexCursor>`
            SELECT * FROM indexCursor 
            WHERE indexName = ${query.indexName}
            AND (${spaceIdParam} IS NULL OR spaceId = ${spaceIdParam})
            AND (${sourceNameParam} IS NULL OR sourceName = ${sourceNameParam})
            AND (${resourceIdParam} IS NULL OR resourceId = ${resourceIdParam})
        `;

        return rows.map((row): IndexCursor => ({
          indexName: row.indexName,
          spaceId: row.spaceId === '' ? null : Schema.decodeSync(SpaceId)(row.spaceId!),
          sourceName: row.sourceName,
          resourceId: row.resourceId === '' ? null : row.resourceId,
          cursor: row.cursor,
        }));
      }),
  );

  updateCursors = Effect.fn('IndexTracker.updateCursors')(
    (cursors: IndexCursor[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* Effect.forEach(
          cursors,
          (cursor) => {
            const spaceId = cursor.spaceId ?? '';
            const resourceId = cursor.resourceId ?? '';
            return sql`
            INSERT INTO indexCursor (indexName, spaceId, sourceName, resourceId, cursor)
            VALUES (${cursor.indexName}, ${spaceId}, ${cursor.sourceName}, ${resourceId}, ${cursor.cursor})
            ON CONFLICT(indexName, spaceId, sourceName, resourceId) DO UPDATE SET cursor = excluded.cursor
          `;
          },
          { discard: true },
        );
      }),
  );
}
