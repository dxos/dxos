//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Migrator from '@effect/sql/Migrator';
import * as SqlClient from '@effect/sql/SqlClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { readdirSync } from 'node:fs';
import { test } from 'vitest';

import { SqlMigrations, SqlTransaction } from '@dxos/sql-sqlite';

import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations';
import init from './migrations/0001_init.sql?raw';

const TestLayer = SqlTransaction.layer.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })));

/** Mirrors `FeedStore.migrate`, so the tests exercise the production configuration. */
const migrate = Migrator.make({})({
  loader: Migrator.fromRecord(MIGRATIONS),
  table: MIGRATIONS_TABLE,
}).pipe(Effect.provide(SqlTransaction.clientLayer), Effect.orDie);

describe('feed migrations', () => {
  // The initial migration runs against databases that already hold these tables. Nothing else
  // catches a missing clause: it does not change the resulting schema.
  test('every CREATE in the initial migration is idempotent', () => {
    const bare = SqlMigrations.splitStatements(init)
      .filter((statement) => /^CREATE\s/i.test(statement))
      .filter(
        (statement) =>
          !/^CREATE\s+(?:VIRTUAL\s+TABLE|UNIQUE\s+INDEX|TABLE|INDEX)\s+IF\s+NOT\s+EXISTS\s/i.test(statement),
      );

    expect(bare).toEqual([]);
  });

  // A file missing from the manifest never runs, silently.
  test('the manifest lists every migration file', () => {
    const onDisk = readdirSync(new URL('./migrations', import.meta.url))
      .filter((entry) => entry.endsWith('.sql'))
      .map((entry) => entry.replace('.sql', ''));

    expect(onDisk.filter((file) => !(file in MIGRATIONS))).toEqual([]);
  });

  it.effect('applies on a fresh database, and a second run is a no-op', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      expect(yield* migrate).toEqual([[1, 'init']]);

      const tables = yield* sql<{ name: string }>`SELECT name FROM sqlite_master WHERE type = 'table'`;
      expect(tables.map((table) => table.name)).toContain('feeds');
      expect(yield* migrate).toEqual([]);
    }).pipe(Effect.provide(TestLayer)),
  );

  // A database created before migration tracking already holds these tables; migration 1 applies as
  // a no-op and rows survive.
  it.effect('is a no-op on a database that already has the tables', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* SqlMigrations.apply(init);
      yield* sql`INSERT INTO cursor_tokens (spaceId, token) VALUES ('space-1', 'token-1')`;

      expect(yield* migrate).toEqual([[1, 'init']]);

      const rows = yield* sql<{ token: string }>`SELECT token FROM cursor_tokens`;
      expect(rows.map((row) => row.token)).toEqual(['token-1']);
    }).pipe(Effect.provide(TestLayer)),
  );
});
