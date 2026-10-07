//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as SqlClient from 'effect/sql/SqlClient';
import * as SqlError from 'effect/sql/SqlError';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';
import { layerMemory } from '@dxos/sql-sqlite/Platform';

import * as SqlService from './SqlService.ts';

/** Two databases and the host share one SQLite file, as in the client services host. */
const run = <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient | SqlService.SqlService>) =>
  EffectEx.runPromise(
    effect.pipe(Effect.provide(Layer.provideMerge(SqlService.layerGuarded, layerMemory)), Effect.scoped),
  );

const inDatabase = <A, E>(name: string, effect: Effect.Effect<A, E, SqlClient.SqlClient>) =>
  effect.pipe(Effect.provide(SqlService.database({ name })));

const exec = (name: string, statement: string) =>
  inDatabase(
    name,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      return yield* sql.unsafe(statement);
    }),
  );

const reasonTag = (exit: Exit.Exit<unknown, unknown>) =>
  Exit.isFailure(exit) && Cause.hasFails(exit.cause)
    ? Cause.findErrorOption(exit.cause).pipe(
        Option.filter(SqlError.isSqlError),
        Option.map((error) => error.reason._tag),
        Option.getOrUndefined,
      )
    : undefined;

describe('SqlService', () => {
  test('round-trips through the client', async ({ expect }) => {
    const rows = await run(
      inDatabase(
        'notes',
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          yield* sql`CREATE TABLE items (id INTEGER PRIMARY KEY, title TEXT)`;
          yield* sql`INSERT INTO items ${sql.insert({ id: 1, title: 'hello' })}`;
          return yield* sql<{ id: number; title: string }>`SELECT * FROM items`;
        }),
      ),
    );
    expect(rows).toEqual([{ id: 1, title: 'hello' }]);
  });

  test('isolates databases from each other and from host tables', async ({ expect }) => {
    const exits = await run(
      Effect.gen(function* () {
        const host = yield* SqlClient.SqlClient;
        yield* host`CREATE TABLE keyring (secret TEXT)`;
        yield* exec('a', 'CREATE TABLE owned (id INTEGER)');
        const attempt = (name: string, statement: string) => exec(name, statement).pipe(Effect.exit);

        return {
          ownRead: yield* attempt('a', 'SELECT * FROM owned'),
          otherRead: yield* attempt('b', 'SELECT * FROM owned'),
          otherDrop: yield* attempt('b', 'DROP TABLE owned'),
          hostRead: yield* attempt('a', 'SELECT * FROM keyring'),
          hostIndex: yield* attempt('a', 'CREATE INDEX steal ON keyring (secret)'),
          catalog: yield* attempt('a', 'SELECT name FROM sqlite_master'),
        };
      }),
    );

    expect(Exit.isSuccess(exits.ownRead)).toBe(true);
    for (const exit of [exits.otherRead, exits.otherDrop, exits.hostRead, exits.hostIndex, exits.catalog]) {
      expect(reasonTag(exit)).toBe('AuthorizationError');
    }
  });

  test('transactions commit, roll back and stay inside the ownership rules', async ({ expect }) => {
    const result = await run(
      Effect.gen(function* () {
        yield* exec('a', 'CREATE TABLE ledger (id INTEGER PRIMARY KEY, amount INTEGER)');
        yield* exec('b', 'CREATE TABLE other (id INTEGER)');
        const inA = <A, E>(effect: (sql: SqlClient.SqlClient) => Effect.Effect<A, E>) =>
          inDatabase(
            'a',
            Effect.gen(function* () {
              return yield* effect(yield* SqlClient.SqlClient);
            }),
          );

        yield* inA((sql) => sql.withTransaction(sql`INSERT INTO ledger (amount) VALUES (1), (2)`));
        const rolledBack = yield* inA((sql) =>
          sql.withTransaction(
            Effect.gen(function* () {
              yield* sql`INSERT INTO ledger (amount) VALUES (100)`;
              return yield* Effect.fail('abort');
            }),
          ),
        ).pipe(Effect.exit);
        const nested = yield* inA((sql) => sql.withTransaction(sql.withTransaction(sql`SELECT 1`))).pipe(Effect.exit);
        const foreign = yield* inA((sql) => sql.withTransaction(sql`SELECT * FROM other`)).pipe(Effect.exit);
        const rows = yield* inA((sql) => sql<{ amount: number }>`SELECT amount FROM ledger ORDER BY id`);
        return { rolledBack, nested, foreign, rows };
      }),
    );

    expect(result.rows.map((row) => row.amount)).toEqual([1, 2]);
    expect(Exit.isFailure(result.rolledBack)).toBe(true);
    expect(reasonTag(result.nested)).toBe('AuthorizationError');
    expect(reasonTag(result.foreign)).toBe('AuthorizationError');
  });

  test('host statements wait for an open transaction instead of joining it', async ({ expect }) => {
    const hostRows = await run(
      Effect.gen(function* () {
        const host = yield* SqlClient.SqlClient;
        yield* host`CREATE TABLE host_log (entry TEXT)`;
        yield* exec('a', 'CREATE TABLE scratch (id INTEGER)');
        const inside = yield* Deferred.make<void>();
        const release = yield* Deferred.make<void>();
        const transaction = yield* inDatabase(
          'a',
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            return yield* sql.withTransaction(
              Effect.gen(function* () {
                yield* sql`INSERT INTO scratch VALUES (1)`;
                yield* Deferred.succeed(inside, undefined);
                yield* Deferred.await(release);
                return yield* Effect.fail('abort');
              }),
            );
          }),
        ).pipe(Effect.exit, Effect.forkChild);
        yield* Deferred.await(inside);
        // Started while the transaction is open; without the lock it would join it and be rolled back.
        const hostWrite = yield* host`INSERT INTO host_log VALUES ('kept')`.pipe(Effect.forkChild);
        yield* Effect.yieldNow;
        yield* Deferred.succeed(release, undefined);
        yield* Fiber.await(transaction);
        yield* Fiber.join(hostWrite);
        return yield* host<{ entry: string }>`SELECT entry FROM host_log`;
      }),
    );
    expect(hostRows).toEqual([{ entry: 'kept' }]);
  });

  test('releases ownership when an object is dropped', async ({ expect }) => {
    const exit = await run(
      Effect.gen(function* () {
        yield* exec('a', 'CREATE TABLE shared (id INTEGER)');
        yield* exec('a', 'DROP TABLE shared');
        yield* exec('b', 'CREATE TABLE shared (id INTEGER)');
        return yield* exec('b', 'SELECT * FROM shared').pipe(Effect.exit);
      }),
    );
    expect(Exit.isSuccess(exit)).toBe(true);
  });
});
