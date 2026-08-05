//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Migrator from '@effect/sql/Migrator';
import * as SqlClient from '@effect/sql/SqlClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { SqlMigrations, SqlTransaction } from '@dxos/sql-sqlite';

import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations';
import init from './migrations/0001_init.sql?raw';

const TestLayer = SqlTransaction.layer.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })));

type TableInfo = { name: string; type: string; notnull: number; pk: number; dflt_value: string | null };
type ForeignKey = { from: string; table: string; to: string; on_delete: string; on_update: string };

/** Mirrors `FeedStore.migrate`, so the tests exercise the production configuration. */
const migrate = Migrator.make({})({
  loader: Migrator.fromRecord(MIGRATIONS),
  table: MIGRATIONS_TABLE,
}).pipe(Effect.provide(SqlTransaction.clientLayer), Effect.orDie);

/**
 * Reads the physical shape of every user table, so two databases can be compared by what SQLite
 * actually stores rather than by the text of the DDL that produced them. The migrations table is
 * excluded — it is bookkeeping, present only after the migrator has run.
 *
 * Nullability of primary-key columns is deliberately excluded: prisma cannot express a nullable
 * `@id`, so it always emits `NOT NULL` on a primary key where the legacy DDL left it off. For an
 * `INTEGER PRIMARY KEY` that is cosmetic — it aliases the rowid and rejects NULL either way. For a
 * `TEXT PRIMARY KEY` it is a real tightening, pinned by its own test.
 */
const describeSchema = Effect.fn('describeSchema')(function* () {
  const sql = yield* SqlClient.SqlClient;
  const tables = yield* sql<{ name: string }>`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != ${MIGRATIONS_TABLE}
    ORDER BY name
  `;

  const result: Record<string, { columns: string[]; indexes: string[]; foreignKeys: string[] }> = {};
  for (const { name } of tables) {
    const columns = yield* sql.unsafe<TableInfo>(`PRAGMA table_info("${name}")`);
    const indexList = yield* sql.unsafe<{ name: string; unique: number }>(`PRAGMA index_list("${name}")`);
    const foreignKeys = yield* sql.unsafe<ForeignKey>(`PRAGMA foreign_key_list("${name}")`);

    const indexes: string[] = [];
    for (const index of indexList.filter((entry) => !entry.name.startsWith('sqlite_'))) {
      const info = yield* sql.unsafe<{ name: string }>(`PRAGMA index_info("${index.name}")`);
      indexes.push(`${index.name}${index.unique ? ' UNIQUE' : ''}(${info.map((column) => column.name).join(',')})`);
    }

    result[name] = {
      columns: columns.map(
        (column) =>
          `${column.name} ${column.type}` +
          `${column.notnull && !column.pk ? ' NOT NULL' : ''}` +
          `${column.pk ? ` PK${column.pk}` : ''}` +
          `${column.dflt_value !== null ? ` DEFAULT ${column.dflt_value}` : ''}`,
      ),
      indexes: indexes.sort(),
      foreignKeys: foreignKeys
        .map((key) => `${key.from}->${key.table}.${key.to} ON DELETE ${key.on_delete} ON UPDATE ${key.on_update}`)
        .sort(),
    };
  }
  return result;
});

const appliedIds = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* sql<{ migration_id: number; name: string }>`
    SELECT migration_id, name FROM ${sql(MIGRATIONS_TABLE)} ORDER BY migration_id
  `.withoutTransform;
  return rows.map((row) => [row.migration_id, row.name]);
});

describe('generated feed schema', () => {
  // Pins the one intended divergence from the legacy DDL, so it stays a decision rather than
  // drifting into an accident. Only fresh databases are affected.
  it.effect('tightens nullable TEXT primary keys to NOT NULL', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* migrate;

      const primaryKeys = yield* Effect.forEach(['subscriptions', 'cursor_tokens'], (table) =>
        Effect.map(
          sql.unsafe<TableInfo>(`PRAGMA table_info("${table}")`),
          (columns) =>
            [table, columns.filter((column) => column.pk > 0).map((column) => column.notnull === 1)] as const,
        ),
      );

      expect(Object.fromEntries(primaryKeys)).toEqual({ subscriptions: [true], cursor_tokens: [true] });
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe('feed migrations', () => {
  // The initial migration is applied to databases that already hold these tables — anything created
  // before migration tracking existed — so every CREATE in it has to tolerate that. Nothing else
  // enforces this: the clause is added by hand, and it does not change the resulting schema, so the
  // equivalence assertions above cannot see it missing.
  it('every CREATE in the initial migration is idempotent', ({ expect }) => {
    // Split first, so a `;` or the words inside a comment or string literal cannot be mistaken for
    // a statement boundary.
    const bare = SqlMigrations.splitStatements(init)
      .filter((statement) => /^CREATE\s/i.test(statement))
      .filter(
        (statement) =>
          !/^CREATE\s+(?:VIRTUAL\s+TABLE|UNIQUE\s+INDEX|TABLE|INDEX)\s+IF\s+NOT\s+EXISTS\s/i.test(statement),
      )
      .map((statement) => statement.split('\n')[0]);

    expect(bare).toEqual([]);
  });

  // A `.sql` file that is not in the manifest never runs, silently: the migrator only sees what
  // `MIGRATIONS` lists. The manifest stays explicit so a bundler cannot change what ships, and this
  // asserts it stays complete.
  it('the manifest lists every migration file', ({ expect }) => {
    const files = import.meta.glob('./migrations/*.sql', { query: '?raw', eager: true });
    const onDisk = Object.keys(files)
      .map((path) => path.replace('./migrations/', '').replace('.sql', ''))
      .sort();

    expect(onDisk).toEqual(Object.keys(MIGRATIONS).sort());
  });

  it.effect('applies and records every migration on a fresh database', () =>
    Effect.gen(function* () {
      expect(yield* migrate).toEqual(Object.keys(MIGRATIONS).map((key) => [Number(key.split('_')[0]), 'init']));
      expect(yield* appliedIds).toEqual([[1, 'init']]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('is a no-op on the second run', () =>
    Effect.gen(function* () {
      yield* migrate;
      const first = yield* describeSchema();

      expect(yield* migrate).toEqual([]);
      expect(yield* describeSchema()).toEqual(first);
    }).pipe(Effect.provide(TestLayer)),
  );

  // A database created before migration tracking holds these tables but has no history, so the
  // migrator runs migration 1 against it. That is safe only because every statement is
  // `IF NOT EXISTS`. Applying the migration's own SQL directly stands in for such a database — it is
  // the same DDL those releases produced, without restating it.
  it.effect('applies as a no-op to a database that already has the tables', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* SqlMigrations.apply(init);
      yield* sql`INSERT INTO cursor_tokens (spaceId, token) VALUES ('space-1', 'token-1')`;
      const before = yield* describeSchema();

      expect(yield* migrate).toEqual([[1, 'init']]);

      expect(yield* describeSchema()).toEqual(before);
      expect(yield* appliedIds).toEqual([[1, 'init']]);
      const rows = yield* sql<{ token: string }>`SELECT token FROM cursor_tokens`;
      expect(rows.map((row) => row.token)).toEqual(['token-1']);
    }).pipe(Effect.provide(TestLayer)),
  );
});
