import { SqlClient, type SqlError } from '@effect/sql';
import { Effect, Schema } from 'effect';
import { SpaceId } from '@dxos/keys';

export const IndexCursor = Schema.Struct({
  indexName: Schema.String,
  spaceId: Schema.NullOr(SpaceId),
  sourceNamespace: Schema.String,
  sourceId: Schema.NullOr(Schema.String),
  cursor: Schema.Union(Schema.Number, Schema.String),
});
export interface IndexCursor extends Schema.Schema.Type<typeof IndexCursor> {}

export class IndexTracker {
  runMigrations = Effect.fn('IndexTracker.runMigrations')(function* () {
    const sql = yield* SqlClient.SqlClient;

    // For automerge: last-indexed heads of the document
    // For queue: the position of the item that was indexed last
    yield* sql`CREATE TABLE IF NOT EXISTS indexCursor (
      indexName TEXT NOT NULL, -- name of the index owning this cursor
      spaceId TEXT NOT NULL DEFAULT '', -- '' <empty string> if multi-space index
      sourceNamespace TEXT NOT NULL, -- 'automerge' / 'queue' / 'index' (for secondary indexes)
      sourceId TEXT NOT NULL DEFAULT '', -- doc_id, queue_id, '' <empty string> (if indexing entire namespace)
      cursor, -- heads / queue position / version
      PRIMARY KEY (indexName, spaceId, sourceNamespace, sourceId)
    )`;
  });

  queryCursors = Effect.fn('IndexTracker.queryCursors')(
    (
      query: Pick<IndexCursor, 'indexName'> & Partial<Pick<IndexCursor, 'sourceNamespace' | 'sourceId' | 'spaceId'>>,
    ): Effect.Effect<IndexCursor[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        const spaceIdParam = query.spaceId === undefined ? null : (query.spaceId ?? '');
        const sourceNamespaceParam = query.sourceNamespace === undefined ? null : query.sourceNamespace;
        const sourceIdParam = query.sourceId === undefined ? null : (query.sourceId ?? '');

        const rows = yield* sql<IndexCursor>`
            SELECT * FROM indexCursor 
            WHERE indexName = ${query.indexName}
            AND (${spaceIdParam} IS NULL OR spaceId = ${spaceIdParam})
            AND (${sourceNamespaceParam} IS NULL OR sourceNamespace = ${sourceNamespaceParam})
            AND (${sourceIdParam} IS NULL OR sourceId = ${sourceIdParam})
        `;

        return rows.map(
          (row): IndexCursor => ({
            indexName: row.indexName,
            spaceId: row.spaceId === '' ? null : Schema.decodeSync(SpaceId)(row.spaceId!),
            sourceNamespace: row.sourceNamespace,
            sourceId: row.sourceId === '' ? null : row.sourceId,
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
            const sourceId = cursor.sourceId ?? '';
            return sql`
            INSERT INTO indexCursor (indexName, spaceId, sourceNamespace, sourceId, cursor)
            VALUES (${cursor.indexName}, ${spaceId}, ${cursor.sourceNamespace}, ${sourceId}, ${cursor.cursor})
            ON CONFLICT(indexName, spaceId, sourceNamespace, sourceId) DO UPDATE SET cursor = excluded.cursor
          `;
          },
          { discard: true },
        );
      }),
  );
}
