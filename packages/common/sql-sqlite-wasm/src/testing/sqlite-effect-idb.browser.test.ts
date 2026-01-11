import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqlClient from '@effect/sql/SqlClient';
import type { Connection } from '@effect/sql/SqlConnection';
import * as SqlError from '@effect/sql/SqlError';
import * as Statement from '@effect/sql/Statement';
import { describe, expect, it } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { identity } from 'effect/Function';
import { globalValue } from 'effect/GlobalValue';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import * as WaSqlite from '@effect/wa-sqlite';
import SQLiteAsyncESMFactory from '@effect/wa-sqlite/dist/wa-sqlite-async.mjs';
import { IDBBatchAtomicVFS } from '@effect/wa-sqlite/src/examples/IDBBatchAtomicVFS.js';

//
// Copyright 2025 DXOS.org
//

const TEST_VFS_NAME = 'idb-batch-vfs';


const initModule = Effect.runSync(Effect.cached(Effect.promise(() => SQLiteAsyncESMFactory())));

const initEffect = Effect.runSync(Effect.cached(initModule.pipe(Effect.map((module) => WaSqlite.Factory(module)))));

const registered = globalValue('@effect/sql-sqlite-wasm/registered', () => new Set<string>());

const ATTR_DB_SYSTEM_NAME = 'db.system.name';

export interface SqliteClientIDBConfig {
  readonly dbName: string;
  readonly installReactivityHooks?: boolean;
  readonly spanAttributes?: Record<string, unknown>;
  readonly transformResultNames?: (str: string) => string;
  readonly transformQueryNames?: (str: string) => string;
}

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for('@effect/sql-sqlite-wasm/SqliteClient');

/**
 * @category type ids
 * @since 1.0.0
 */
export type TypeId = typeof TypeId;

/**
 * @category constructor
 * @since 1.0.0
 */
export const makeIdb = (
  options: SqliteClientIDBConfig,
): Effect.Effect<SqlClient.SqlClient, SqlError.SqlError, Scope.Scope | Reactivity.Reactivity> =>
  Effect.gen(function* () {
    const reactivity = yield* Reactivity.Reactivity;
    const compiler = Statement.makeCompilerSqlite(options.transformQueryNames);
    const transformRows = options.transformResultNames
      ? Statement.defaultTransforms(options.transformResultNames).array
      : undefined;

    const makeConnection = Effect.gen(function* () {
      const sqlite3 = yield* initEffect;

      if (registered.has(TEST_VFS_NAME) === false) {
        registered.add(TEST_VFS_NAME);
        const module = yield* initModule;
        const vfs = yield* Effect.promise(() => IDBBatchAtomicVFS.create(TEST_VFS_NAME, module));
        sqlite3.vfs_register(vfs as any, false);
      }
      const db = yield* Effect.acquireRelease(
        Effect.try({
          try: () => sqlite3.open_v2(options.dbName, undefined, TEST_VFS_NAME),
          catch: (cause) => new SqlError.SqlError({ cause, message: 'Failed to open database' }),
        }),
        (db) => Effect.sync(() => sqlite3.close(db)),
      );

      if (options.installReactivityHooks) {
        sqlite3.update_hook(db, (_op: any, _db: any, table: any, rowid: any) => {
          if (!table) return;
          const id = String(Number(rowid));
          reactivity.unsafeInvalidate({ [table]: [id] });
        });
      }

      const run = (sql: string, params: ReadonlyArray<unknown> = [], rowMode: 'object' | 'array' = 'object') =>
        Effect.try({
          try: () => {
            const results: Array<any> = [];
            for (const stmt of sqlite3.statements(db, sql)) {
              let columns: Array<string> | undefined;
              sqlite3.bind_collection(stmt, params as any);
              while (sqlite3.step(stmt) === WaSqlite.SQLITE_ROW) {
                columns = columns ?? sqlite3.column_names(stmt);
                const row = sqlite3.row(stmt);
                if (rowMode === 'object') {
                  const obj: Record<string, any> = {};
                  for (let i = 0; i < columns!.length; i++) {
                    obj[columns![i]] = row[i];
                  }
                  results.push(obj);
                } else {
                  results.push(row);
                }
              }
            }
            return results;
          },
          catch: (cause) => new SqlError.SqlError({ cause, message: 'Failed to execute statement' }),
        });

      return identity<Connection>({
        execute: (sql, params, transformRows) =>
          transformRows ? Effect.map(run(sql, params), transformRows) : run(sql, params),
        executeRaw: (sql, params) => run(sql, params),
        executeValues: (sql, params) => run(sql, params, 'array'),
        executeUnprepared(sql, params, transformRows) {
          return this.execute(sql, params, transformRows);
        },
        executeStream: (sql, params, transformRows) => {
          function* stream() {
            for (const stmt of sqlite3.statements(db, sql)) {
              let columns: Array<string> | undefined;
              sqlite3.bind_collection(stmt, params as any);
              while (sqlite3.step(stmt) === WaSqlite.SQLITE_ROW) {
                columns = columns ?? sqlite3.column_names(stmt);
                const row = sqlite3.row(stmt);
                const obj: Record<string, any> = {};
                for (let i = 0; i < columns!.length; i++) {
                  obj[columns![i]] = row[i];
                }
                yield obj;
              }
            }
          }
          return Stream.suspend(() => Stream.fromIteratorSucceed(stream()[Symbol.iterator]())).pipe(
            transformRows
              ? Stream.mapChunks((chunk) => Chunk.unsafeFromArray(transformRows(Chunk.toReadonlyArray(chunk))))
              : identity,
            Stream.mapError((cause) => new SqlError.SqlError({ cause, message: 'Failed to execute statement' })),
          );
        },
        //  export: Effect.try({
        //   try: () => sqlite3.serialize(db, 'main'),
        //   catch: (cause) => new SqlError({ cause, message: 'Failed to export database' }),
        // }),
        // import: (data) =>
        //   Effect.try({
        //     try: () => sqlite3.deserialize(db, 'main', data, data.length, data.length, 1 | 2),
        //     catch: (cause) => new SqlError({ cause, message: 'Failed to import database' }),
        //   }),
      });
    });

    const semaphore = yield* Effect.makeSemaphore(1);
    const connection = yield* makeConnection;

    const acquirer = semaphore.withPermits(1)(Effect.succeed(connection));
    const transactionAcquirer = Effect.uninterruptibleMask((restore) =>
      Effect.as(
        Effect.zipRight(
          restore(semaphore.take(1)),
          Effect.tap(Effect.scope, (scope) => Scope.addFinalizer(scope, semaphore.release(1))),
        ),
        connection,
      ),
    );

    return Object.assign(
      (yield* SqlClient.make({
        acquirer,
        compiler,
        transactionAcquirer,
        spanAttributes: [
          ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
          [ATTR_DB_SYSTEM_NAME, 'sqlite'],
        ],
        transformRows,
      })) as SqlClient.SqlClient,
      {
        [TypeId]: TypeId as TypeId,
        config: options,
        // export: semaphore.withPermits(1)(connection.export),
        // import: (data: Uint8Array) => semaphore.withPermits(1)(connection.import(data)),
      },
    );
  });

const TestLayer = 
  Layer.scoped(SqlClient.SqlClient,
    makeIdb({
        dbName: 'testing',
      }),
    ).pipe(Layer.provideMerge(Reactivity.layer));

describe('effect SQLite with IDBBatchAtomicVFS', () => {
  it.effect(
    'basic CRUD operations',
    Effect.fnUntraced(function* () {
      const sql = yield* SqlClient.SqlClient;

      // Create table.
      yield* sql`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT
      )
    `;

      // Insert data.
      yield* sql`
      INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
      INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');
    `;

      // Select data.
      const results = yield* sql`SELECT * FROM users ORDER BY id`;

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Alice');
      expect(results[1].name).toBe('Bob');

      // // Update data.
      // await sqlite3.exec(db, `UPDATE users SET email = 'alice.updated@example.com' WHERE name = 'Alice'`);

      // // Verify update.
      // const updatedResults: Array<{ email: string }> = [];
      // await sqlite3.exec(db, `SELECT email FROM users WHERE name = 'Alice'`, (row: any[]) => {
      //   updatedResults.push({ email: row[0] });
      // });
      // expect(updatedResults[0].email).toBe('alice.updated@example.com');

      // // Delete data.
      // await sqlite3.exec(db, `DELETE FROM users WHERE name = 'Bob'`);

      // // Verify deletion.
      // const remainingResults: Array<{ name: string }> = [];
      // await sqlite3.exec(db, 'SELECT name FROM users', (row: any[]) => {
      //   remainingResults.push({ name: row[0] });
      // });
      // expect(remainingResults).toHaveLength(1);
      // expect(remainingResults[0].name).toBe('Alice');

      // // Close database.
      // await sqlite3.close(db);

      // await sleep(10000000);
    }, Effect.provide(TestLayer)),
  );
});
