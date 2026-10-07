//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
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
          transaction: yield* inDatabase(
            'a',
            Effect.gen(function* () {
              const sql = yield* SqlClient.SqlClient;
              return yield* sql.withTransaction(sql`SELECT 1`);
            }),
          ).pipe(Effect.exit),
        };
      }),
    );

    expect(Exit.isSuccess(exits.ownRead)).toBe(true);
    for (const exit of [
      exits.otherRead,
      exits.otherDrop,
      exits.hostRead,
      exits.hostIndex,
      exits.catalog,
      exits.transaction,
    ]) {
      expect(reasonTag(exit)).toBe('AuthorizationError');
    }
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
