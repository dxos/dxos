import { Effect, Schema } from 'effect';
import type { Index, IndexerObject } from './interface';
import { SqlClient } from '@effect/sql';

export const Snapshot = Schema.Struct({
  snapshot: Schema.String,
});
export interface Snapshot extends Schema.Schema.Type<typeof Snapshot> {}

export class FtsIndex implements Index {
  migrate = Effect.fn('FtsIndex.migrate')(function* () {
    const sql = yield* SqlClient.SqlClient;

    yield* sql`CREATE TABLE IF NOT EXISTS ftsIndex (
      recordId INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot TEXT NOT NULL default '', -- JSON snapshot of the document
      USING fts5(snapshot),
    )`;
  });

  update(objects: IndexerObject[]) {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`INSERT INTO ftsIndex (snapshot) VALUES (${JSON.stringify(objects)})`;
    });
  }
}
