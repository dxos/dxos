//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';
import { readdirSync } from 'node:fs';
import { test } from 'vitest';

import { SpaceId } from '@dxos/keys';
import * as SqlMigrations from '@dxos/sql-sqlite/SqlMigrations';

import init from './migrations/0001_init.sql?raw';
import feedStorage from './migrations/0002_feed_storage.sql?raw';
import changes from './migrations/0003_changes.sql?raw';
import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/index.ts';
import { ObjectStore } from './object-store.ts';

const TestLayer = SqliteClient.layer({ filename: ':memory:' });

/** Derived from the manifest, so adding a migration does not stale the assertions. */
const ids = Object.keys(MIGRATIONS);

const applied = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* sql<{ name: string; migration_id: number }>`
    SELECT migration_id, name FROM ${sql(MIGRATIONS_TABLE)} ORDER BY migration_id
  `;
  return rows.map((row) => `${String(row.migration_id).padStart(4, '0')}_${row.name}`);
});

describe('echo-sqlite migrations', () => {
  // A migration may run against a database that already holds its tables; the clause is what makes it a no-op.
  test('every CREATE in a migration is idempotent', () => {
    const bare = [init, feedStorage, changes]
      .flatMap((migration) => SqlMigrations.splitStatements(migration))
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
      yield* ObjectStore.open(SpaceId.random());
      expect(yield* applied).toEqual(ids);
      yield* ObjectStore.open(SpaceId.random());
      expect(yield* applied).toEqual(ids);
    }).pipe(Effect.provide(TestLayer)),
  );

  // A file written before objects moved into the feed store holds the 0001 tables, which nothing reads now.
  it.effect('drops the tables of the initial migration', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* SqlMigrations.apply(init);
      yield* ObjectStore.open(SpaceId.random());
      const tables = yield* sql<{ name: string }>`SELECT name FROM sqlite_master WHERE name LIKE 'echo_entities%'`;
      expect(tables).toEqual([]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('mints one device actor per file', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* ObjectStore.open(SpaceId.random());
      yield* ObjectStore.open(SpaceId.random());
      const rows = yield* sql<{ actorId: string }>`SELECT actorId FROM echo_sqlite_device`;
      expect(rows).toHaveLength(1);
    }).pipe(Effect.provide(TestLayer)),
  );
});
