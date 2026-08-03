//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as SqlClient from '@effect/sql/SqlClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as SqlMigrator from './SqlMigrator';
import * as SqlTransaction from './SqlTransaction';

const TABLE = 'test_migrations';

const CREATE_WIDGETS: SqlMigrator.Migration = {
  id: 1,
  name: 'init',
  sql: 'CREATE TABLE IF NOT EXISTS widgets (id TEXT PRIMARY KEY)',
};

const client = SqliteClient.layer({ filename: ':memory:' });

/** The layer stores use in node and the browser. */
const NativeLayer = SqlTransaction.layer.pipe(Layer.provideMerge(client));

/**
 * Stands in for a Durable Object, where `BEGIN` / `COMMIT` is forbidden and the platform supplies
 * its own transaction via `ctx.storage.transaction()`. Modelled as a pass-through, which is the
 * worst case: if the migrator depended on the client's transaction, nothing would roll back and
 * the statements would still have to succeed on their own.
 */
const DurableObjectLayer = Layer.succeed(SqlTransaction.SqlTransaction, {
  withTransaction: (self) => self,
}).pipe(Layer.provideMerge(client));

const appliedIds = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* sql<{ migration_id: number }>`
    SELECT migration_id FROM ${sql(TABLE)} ORDER BY migration_id
  `.withoutTransform;
  return rows.map((row) => row.migration_id);
});

const run = (migrations: ReadonlyArray<SqlMigrator.Migration>, baseline?: SqlMigrator.Baseline) =>
  SqlMigrator.run({ table: TABLE, migrations, baseline, now: 0 });

describe('SqlMigrator', () => {
  for (const [label, layer] of [
    ['native transaction', NativeLayer],
    ['durable-object transaction', DurableObjectLayer],
  ] as const) {
    describe(label, () => {
      it.effect('applies and records pending migrations', () =>
        Effect.gen(function* () {
          expect(yield* run([CREATE_WIDGETS])).toEqual([[1, 'init']]);
          expect(yield* appliedIds).toEqual([1]);
        }).pipe(Effect.provide(layer)),
      );

      it.effect('is a no-op once everything is recorded', () =>
        Effect.gen(function* () {
          yield* run([CREATE_WIDGETS]);
          expect(yield* run([CREATE_WIDGETS])).toEqual([]);
          expect(yield* appliedIds).toEqual([1]);
        }).pipe(Effect.provide(layer)),
      );

      it.effect('applies a later migration on top', () =>
        Effect.gen(function* () {
          yield* run([CREATE_WIDGETS]);
          const second = { id: 2, name: 'add_label', sql: 'ALTER TABLE widgets ADD COLUMN label TEXT' };

          expect(yield* run([CREATE_WIDGETS, second])).toEqual([[2, 'add_label']]);
          expect(yield* appliedIds).toEqual([1, 2]);
        }).pipe(Effect.provide(layer)),
      );
    });
  }

  describe('pending selection', () => {
    it.effect('applies an id inserted below the highest recorded one', () =>
      Effect.gen(function* () {
        const third = { id: 3, name: 'third', sql: 'CREATE TABLE IF NOT EXISTS third (id TEXT)' };
        yield* run([CREATE_WIDGETS, third]);

        const second = { id: 2, name: 'second', sql: 'CREATE TABLE IF NOT EXISTS second (id TEXT)' };
        expect(yield* run([CREATE_WIDGETS, second, third])).toEqual([[2, 'second']]);
        expect(yield* appliedIds).toEqual([1, 2, 3]);
      }).pipe(Effect.provide(NativeLayer)),
    );

    it.effect('applies in id order regardless of manifest order', () =>
      Effect.gen(function* () {
        const second = { id: 2, name: 'second', sql: 'ALTER TABLE widgets ADD COLUMN label TEXT' };
        // `second` depends on `widgets` existing, so a manifest-order run would fail here.
        expect(yield* run([second, CREATE_WIDGETS])).toEqual([
          [1, 'init'],
          [2, 'second'],
        ]);
      }).pipe(Effect.provide(NativeLayer)),
    );
  });

  describe('integrity', () => {
    it.effect('rejects duplicate ids', () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(run([CREATE_WIDGETS, { ...CREATE_WIDGETS, name: 'clash' }]));
        expect(error._tag === 'SqlMigrationError' && error.reason).toEqual('duplicate-id');
      }).pipe(Effect.provide(NativeLayer)),
    );

    it.effect('rejects a migration edited after it was applied', () =>
      Effect.gen(function* () {
        yield* run([CREATE_WIDGETS]);
        const error = yield* Effect.flip(run([{ ...CREATE_WIDGETS, sql: `${CREATE_WIDGETS.sql} -- edited` }]));
        expect(error._tag === 'SqlMigrationError' && error.reason).toEqual('checksum-mismatch');
      }).pipe(Effect.provide(NativeLayer)),
    );

    it.effect('tolerates line-ending differences in an applied migration', () =>
      Effect.gen(function* () {
        yield* run([{ ...CREATE_WIDGETS, sql: 'CREATE TABLE IF NOT EXISTS widgets (\n  id TEXT PRIMARY KEY\n)' }]);
        // A CRLF checkout must not read as an edit.
        const crlf = { ...CREATE_WIDGETS, sql: 'CREATE TABLE IF NOT EXISTS widgets (\r\n  id TEXT PRIMARY KEY\r\n)' };
        expect(yield* run([crlf])).toEqual([]);
      }).pipe(Effect.provide(NativeLayer)),
    );
  });

  describe('baselining', () => {
    const baseline: SqlMigrator.Baseline = { throughId: 1, when: SqlMigrator.tableExists('widgets') };

    it.effect('records without executing when the marker table is present', () =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        // A database from before migration tracking: table present, no history.
        yield* sql`CREATE TABLE widgets (id TEXT PRIMARY KEY)`;
        yield* sql`INSERT INTO widgets (id) VALUES ('kept')`;

        expect(yield* run([CREATE_WIDGETS], baseline)).toEqual([]);
        expect(yield* appliedIds).toEqual([1]);
        const rows = yield* sql<{ id: string }>`SELECT id FROM widgets`;
        expect(rows.map((row) => row.id)).toEqual(['kept']);
      }).pipe(Effect.provide(NativeLayer)),
    );

    it.effect('does not stamp a fresh database', () =>
      Effect.gen(function* () {
        expect(yield* run([CREATE_WIDGETS], baseline)).toEqual([[1, 'init']]);
      }).pipe(Effect.provide(NativeLayer)),
    );

    it.effect('still applies migrations above throughId', () =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`CREATE TABLE widgets (id TEXT PRIMARY KEY)`;
        const second = { id: 2, name: 'second', sql: 'ALTER TABLE widgets ADD COLUMN label TEXT' };

        expect(yield* run([CREATE_WIDGETS, second], baseline)).toEqual([[2, 'second']]);
        expect(yield* appliedIds).toEqual([1, 2]);
      }).pipe(Effect.provide(NativeLayer)),
    );

    it.effect('never stamps once any history exists', () =>
      Effect.gen(function* () {
        yield* run([CREATE_WIDGETS]);
        const second = { id: 2, name: 'second', sql: 'ALTER TABLE widgets ADD COLUMN label TEXT' };
        // `throughId: 2` must not stamp 2, because the table is now authoritative.
        expect(yield* run([CREATE_WIDGETS, second], { throughId: 2, when: Effect.succeed(true) })).toEqual([
          [2, 'second'],
        ]);
      }).pipe(Effect.provide(NativeLayer)),
    );
  });
});
