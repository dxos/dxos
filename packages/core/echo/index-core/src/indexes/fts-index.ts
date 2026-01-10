//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import type { Index, IndexerObject } from './interface';

export const Snapshot = Schema.Struct({
  snapshot: Schema.String,
});
export interface Snapshot extends Schema.Schema.Type<typeof Snapshot> {}

export interface FtsQuery {
  query: string;
}

export class FtsIndex implements Index {
  migrate = Effect.fn('FtsIndex.migrate')(function* () {
    const sql = yield* SqlClient.SqlClient;

    // https://sqlite.org/fts5.html
    // FTS5 tables are created as virtual tables; they implicitly have a `rowid`.
    yield* sql`CREATE VIRTUAL TABLE IF NOT EXISTS ftsIndex USING fts5(snapshot)`;
  });

  query({ query }: FtsQuery) {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const result = yield* sql<Snapshot>`SELECT * FROM ftsIndex WHERE ftsIndex MATCH ${query} LIMIT 10`;
      return result as readonly Snapshot[];
    });
  }

  update = Effect.fn('FtsIndex.update')(
    (objects: IndexerObject[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        yield* Effect.forEach(
          objects,
          (object) =>
            Effect.gen(function* () {
              const { recordId, data } = object;
              if (recordId === null) {
                yield* Effect.die(new Error('FtsIndex.update requires recordId to be set'));
              }

              const snapshot = JSON.stringify(data);

              // FTS5 doesn't support UPDATE, need DELETE + INSERT for upsert.
              const existing = yield* sql<{ rowid: number }>`SELECT rowid FROM ftsIndex WHERE rowid = ${recordId}`;
              if (existing.length > 0) {
                yield* sql`DELETE FROM ftsIndex WHERE rowid = ${recordId}`;
              }

              yield* sql`INSERT INTO ftsIndex (rowid, snapshot) VALUES (${recordId}, ${snapshot})`;
            }),
          { discard: true },
        );
      }),
  );
}
