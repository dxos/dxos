//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import type { Index, IndexerObject } from './interface';

export const Snapshot = Schema.Struct({
  snapshot: Schema.String,
});
export interface Snapshot extends Schema.Schema.Type<typeof Snapshot> {}

export class FtsIndex implements Index {
  migrate = Effect.fn('FtsIndex.migrate')(function* () {
    const sql = yield* SqlClient.SqlClient;

    // https://sqlite.org/fts5.html
    // FTS5 tables are created as virtual tables; they implicitly have a `rowid`.
    yield* sql`CREATE VIRTUAL TABLE IF NOT EXISTS ftsIndex USING fts5(snapshot)`;
  });

  query(query: string) {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const result = yield* sql`SELECT * FROM ftsIndex WHERE ftsIndex MATCH ${query}`;
      return result;
    });
  }

  update(objects: IndexerObject[]) {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`INSERT INTO ftsIndex (snapshot) VALUES (${JSON.stringify(objects)})`;
    });
  }
}
