//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import { readdirSync } from 'node:fs';
import { test } from 'vitest';

import { SpaceId } from '@dxos/keys';
import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './migrations/0001_init.sql?raw';
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
  // Migration 1 may run against a database that already holds the tables; the clause is what makes it a no-op.
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
      const store = new ObjectStore(SpaceId.random());
      yield* store.migrate();
      expect(yield* applied).toEqual(ids);
      yield* store.migrate();
      expect(yield* applied).toEqual(ids);
    }).pipe(Effect.provide(TestLayer)),
  );

  // `echo_fts` rows are keyed by the entity rowid; only an explicit alias survives VACUUM unchanged.
  it.effect('entities have an explicit INTEGER PRIMARY KEY for the text index to key on', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* new ObjectStore(SpaceId.random()).migrate();
      const columns = yield* sql<{ name: string; type: string; pk: number }>`PRAGMA table_info(echo_entities)`;
      expect(columns.filter((column) => column.pk > 0)).toEqual([
        expect.objectContaining({ name: 'seq', type: 'INTEGER', pk: 1 }),
      ]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('is a no-op on a database that already has the tables', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const spaceId = SpaceId.random();
      yield* SqlMigrations.apply(init);
      yield* sql`
        INSERT INTO echo_entities (space_id, id, kind, type_dxn, deleted, created_at, updated_at, body)
        VALUES (${spaceId}, 'legacy', 'object', 'dxn:com.example.type.legacy:0.1.0', 0, 1, 1, '{}')
      `;

      const store = new ObjectStore(spaceId);
      yield* store.migrate();
      expect(yield* applied).toEqual(ids);
      expect((yield* store.load('legacy'))?.id).toBe('legacy');
    }).pipe(Effect.provide(TestLayer)),
  );
});
