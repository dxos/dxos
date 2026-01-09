import { SqliteClient } from '@effect/sql-sqlite-node';
import { Effect } from 'effect';
import { describe, it, expect } from 'vitest';
import * as Reactivity from '@effect/experimental/Reactivity';

describe('FTS5', () => {
  it('should create an FTS5 table and search it', () =>
    Effect.gen(function* () {
      const sql = yield* SqliteClient.make({
        filename: ':memory:',
      });

      yield* sql`CREATE VIRTUAL TABLE emails USING fts5(sender, title, body);`;

      yield* sql`INSERT INTO emails (sender, title, body) VALUES ('bob@example.com', 'Hello', 'This is a message about Effect');`;
      yield* sql`INSERT INTO emails (sender, title, body) VALUES ('alice@example.com', 'Meeting', 'Let us discuss SQL');`;

      const result = yield* sql`SELECT * FROM emails WHERE emails MATCH 'Effect'`;

      expect(result.length).toEqual(1);
      expect(result[0].sender).toEqual('bob@example.com');
    }).pipe(Effect.provide(Reactivity.layer), Effect.scoped, Effect.runPromise));
});
