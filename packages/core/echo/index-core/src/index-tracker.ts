//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { SpaceId } from '@dxos/keys';

export const IndexCursor = Schema.Struct({
  indexName: Schema.String,
  spaceId: Schema.NullOr(SpaceId),
  sourceName: Schema.String,
  resourceId: Schema.NullOr(Schema.String),
  cursor: Schema.Union(Schema.Number, Schema.String),
});
export interface IndexCursor extends Schema.Schema.Type<typeof IndexCursor> {}

export class IndexTracker {
  migrate = Effect.fn('IndexTracker.migrate')(function* () {
    const sql = yield* SqlClient.SqlClient;

    // For automerge: last-indexed heads of the document
    // For queue: the position of the item that was indexed last
    yield* sql`CREATE TABLE IF NOT EXISTS indexCursor (
      indexName TEXT NOT NULL, -- name of the index owning this cursor
      spaceId TEXT NOT NULL DEFAULT '', -- '' <empty string> if multi-space index
      sourceName TEXT NOT NULL, -- 'automerge' / 'queue' / 'index' (for secondary indexes)
      resourceId TEXT NOT NULL DEFAULT '', -- doc_id, queue_id, '' <empty string> (if indexing entire namespace)
      cursor, -- heads / queue position / version
      PRIMARY KEY (indexName, spaceId, sourceName, resourceId)
    )`;
  });

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

        return rows.map(
          (row): IndexCursor => ({
            indexName: row.indexName,
            spaceId: row.spaceId === '' ? null : Schema.decodeSync(SpaceId)(row.spaceId!),
            sourceName: row.sourceName,
            resourceId: row.resourceId === '' ? null : row.resourceId,
            cursor: row.cursor,
          }),
        );
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
