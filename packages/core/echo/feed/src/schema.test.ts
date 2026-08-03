//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as SqlClient from '@effect/sql/SqlClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { SqlMigrations, SqlMigrator, SqlTransaction } from '@dxos/sql-sqlite';

import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations';
import snapshot from './migrations/snapshot.sql?raw';
import { LEGACY_DDL, describeSchema, migrate } from './testing/schema-harness';

const TestLayer = SqlTransaction.layer.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })));

/** Migrations stamped onto a database that predates migration tracking. */
const BASELINED_THROUGH = 1;

const ALL_MIGRATIONS = MIGRATIONS.map((migration) => [migration.id, migration.name]);
const AFTER_BASELINE = MIGRATIONS.filter((migration) => migration.id > BASELINED_THROUGH).map((migration) => [
  migration.id,
  migration.name,
]);
const NEXT_FREE_ID = Math.max(...MIGRATIONS.map((migration) => migration.id)) + 1;

const appliedIds = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* sql<{ migration_id: number; name: string }>`
    SELECT migration_id, name FROM ${sql(MIGRATIONS_TABLE)} ORDER BY migration_id
  `.withoutTransform;
  return rows.map((row) => [row.migration_id, row.name]);
});

describe('generated feed schema', () => {
  // Migrations are frozen once written, so editing schema.prisma produces no new SQL on its own.
  // This is what stops the two silently diverging: the snapshot always tracks schema.prisma, and
  // replaying the migrations has to reproduce it. A schema change with no accompanying migration
  // fails here.
  it.effect('replaying the migrations reproduces what schema.prisma describes', () =>
    Effect.gen(function* () {
      const fromMigrations = yield* migrate().pipe(Effect.andThen(describeSchema()));
      const fromSnapshot = yield* Effect.provide(
        SqlMigrations.apply(snapshot).pipe(Effect.andThen(describeSchema())),
        TestLayer,
      );

      expect(fromMigrations).toEqual(fromSnapshot);
    }).pipe(Effect.provide(TestLayer)),
  );

  // Scoped to the initial migration deliberately: it is the one that has to match databases built
  // by the pre-prisma DDL. Later migrations are expected to diverge from the legacy shape.
  it.effect('the initial migration matches the legacy hand-written DDL', () =>
    Effect.gen(function* () {
      const fromInit = yield* SqlMigrations.apply(MIGRATIONS[0].sql).pipe(Effect.andThen(describeSchema()));
      const fromLegacy = yield* Effect.provide(
        SqlMigrations.apply(...LEGACY_DDL).pipe(Effect.andThen(describeSchema())),
        TestLayer,
      );

      expect(fromInit).toEqual(fromLegacy);
      expect(Object.keys(fromInit)).toEqual(['blocks', 'cursor_tokens', 'feeds', 'subscriptions', 'sync_state']);
    }).pipe(Effect.provide(TestLayer)),
  );

  // Pins the one intended divergence from the legacy DDL, so it stays a decision rather than
  // drifting into an accident. Only fresh databases are affected.
  it.effect('tightens nullable TEXT primary keys to NOT NULL', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* migrate();

      const primaryKeys = yield* Effect.forEach(['subscriptions', 'cursor_tokens'], (table) =>
        Effect.map(
          sql.unsafe<{ pk: number; notnull: number }>(`PRAGMA table_info("${table}")`),
          (columns) =>
            [table, columns.filter((column) => column.pk > 0).map((column) => column.notnull === 1)] as const,
        ),
      );

      expect(Object.fromEntries(primaryKeys)).toEqual({ subscriptions: [true], cursor_tokens: [true] });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('converges on the same schema whether baselined or migrated from empty', () =>
    Effect.gen(function* () {
      // A database that predates migration tracking: tables already present, no history.
      yield* SqlMigrations.apply(...LEGACY_DDL);
      yield* migrate();
      const baselined = yield* describeSchema();

      const fresh = yield* Effect.provide(migrate().pipe(Effect.andThen(describeSchema())), TestLayer);

      expect(baselined).toEqual(fresh);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('is idempotent on a fresh database', () =>
    Effect.gen(function* () {
      yield* migrate();
      const first = yield* describeSchema();
      yield* migrate();

      expect(yield* describeSchema()).toEqual(first);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('preserves rows in a legacy database', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* SqlMigrations.apply(...LEGACY_DDL);
      yield* sql`INSERT INTO cursor_tokens (spaceId, token) VALUES ('space-1', 'token-1')`;

      yield* migrate();

      const rows = yield* sql<{ token: string }>`SELECT token FROM cursor_tokens`;
      expect(rows.map((row) => row.token)).toEqual(['token-1']);
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe('feed migration history', () => {
  it.effect('executes and records every migration on a fresh database', () =>
    Effect.gen(function* () {
      expect(yield* migrate()).toEqual(ALL_MIGRATIONS);
      expect(yield* appliedIds).toEqual(ALL_MIGRATIONS);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('stamps a legacy database instead of executing the baselined migrations', () =>
    Effect.gen(function* () {
      yield* SqlMigrations.apply(...LEGACY_DDL);

      // The load-bearing assertion is the absence of the baselined ids from the *executed* list:
      // they were recorded without running. The schema alone cannot show this, since migration 1
      // is `IF NOT EXISTS` and would look identical had it run.
      const executed = yield* migrate();
      expect(executed).toEqual(AFTER_BASELINE);
      expect(executed.map(([id]) => id)).not.toContain(1);

      // Recorded nonetheless, so it is never reconsidered.
      expect(yield* appliedIds).toEqual(ALL_MIGRATIONS);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('does not stamp a fresh database', () =>
    Effect.gen(function* () {
      // The baseline predicate must not fire when there is nothing to baseline, or migration 1
      // would be recorded without its tables ever being created.
      expect(yield* migrate()).toEqual(ALL_MIGRATIONS);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('applies a later migration on top of a baselined database', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* SqlMigrations.apply(...LEGACY_DDL);
      yield* migrate();

      const later = {
        id: NEXT_FREE_ID,
        name: 'add_probe',
        sql: 'ALTER TABLE cursor_tokens ADD COLUMN probe TEXT',
      };
      const executed = yield* SqlMigrator.run({
        table: MIGRATIONS_TABLE,
        migrations: [...MIGRATIONS, later],
      });

      expect(executed).toEqual([[later.id, later.name]]);
      const columns = yield* sql.unsafe<{ name: string }>('PRAGMA table_info("cursor_tokens")');
      expect(columns.map((column) => column.name)).toContain('probe');
    }).pipe(Effect.provide(TestLayer)),
  );

  // The @effect/sql migrator this replaced advanced a high-water mark, so a migration numbered
  // below a recorded id was skipped forever. Pending work is now a set difference.
  it.effect('applies a migration inserted below the highest recorded id', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const high = { id: NEXT_FREE_ID + 5, name: 'high', sql: 'ALTER TABLE cursor_tokens ADD COLUMN high TEXT' };
      yield* SqlMigrator.run({ table: MIGRATIONS_TABLE, migrations: [...MIGRATIONS, high] });

      const infill = { id: NEXT_FREE_ID, name: 'infill', sql: 'ALTER TABLE cursor_tokens ADD COLUMN infill TEXT' };
      const executed = yield* SqlMigrator.run({
        table: MIGRATIONS_TABLE,
        migrations: [...MIGRATIONS, infill, high],
      });

      expect(executed).toEqual([[infill.id, infill.name]]);
      const columns = yield* sql.unsafe<{ name: string }>('PRAGMA table_info("cursor_tokens")');
      expect(columns.map((column) => column.name)).toContain('infill');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('reports a migration edited after it was applied', () =>
    Effect.gen(function* () {
      yield* migrate();

      const edited = MIGRATIONS.map((migration) =>
        migration.id === 1 ? { ...migration, sql: `${migration.sql}\n-- edited after the fact` } : migration,
      );
      const error = yield* Effect.flip(SqlMigrator.run({ table: MIGRATIONS_TABLE, migrations: edited }));

      expect(error._tag === 'SqlMigrationError' && error.reason).toEqual('checksum-mismatch');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('accepts an unchanged manifest on every subsequent run', () =>
    Effect.gen(function* () {
      yield* migrate();
      // Guards against a checksum that is not stable across runs, which would make every open fail.
      expect(yield* migrate()).toEqual([]);
      expect(yield* migrate()).toEqual([]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('rejects a manifest with duplicate ids', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        SqlMigrator.run({
          table: MIGRATIONS_TABLE,
          migrations: [...MIGRATIONS, { id: 1, name: 'clash', sql: 'SELECT 1' }],
        }),
      );

      expect(error._tag === 'SqlMigrationError' && error.reason).toEqual('duplicate-id');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('does not re-run a migration that is already recorded', () =>
    Effect.gen(function* () {
      yield* migrate();

      // `ALTER TABLE ... ADD COLUMN` is not idempotent, so a second execution would fail.
      const migrations = [
        ...MIGRATIONS,
        { id: NEXT_FREE_ID, name: 'add_probe', sql: 'ALTER TABLE cursor_tokens ADD COLUMN probe TEXT' },
      ];
      yield* SqlMigrator.run({ table: MIGRATIONS_TABLE, migrations });
      const second = yield* SqlMigrator.run({ table: MIGRATIONS_TABLE, migrations });

      expect(second).toEqual([]);
      expect(yield* appliedIds).toEqual([...ALL_MIGRATIONS, [NEXT_FREE_ID, 'add_probe']]);
    }).pipe(Effect.provide(TestLayer)),
  );
});
