//
// Copyright 2026 DXOS.org
//

/// <reference lib="webworker" />

import * as Reactivity from '@effect/experimental/Reactivity';
import * as WasmSqliteClient from '@effect/sql-sqlite-wasm/SqliteClient';
import * as Client from '@effect/sql/SqlClient';
import * as SqlConnection from '@effect/sql/SqlConnection';
import * as SqlError from '@effect/sql/SqlError';
import * as Statement from '@effect/sql/Statement';
import * as WaSqlite from '@effect/wa-sqlite';
// oxlint-disable-next-line @dxos/rules/effect-subpath-imports
import SQLiteESMFactory from '@effect/wa-sqlite/dist/wa-sqlite.mjs';
import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { identity } from 'effect/Function';
import * as GlobalValue from 'effect/GlobalValue';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import { log } from '@dxos/log';
// @ts-ignore - wa-sqlite example VFS without typed exports.
import { AccessHandlePoolVFS } from '@dxos/wa-sqlite/src/examples/AccessHandlePoolVFS.js';

import {
  applyOpfsPragmas,
  DEFAULT_JOURNAL_MODE,
  DEFAULT_SYNCHRONOUS,
  type SqliteJournalMode,
  type SqliteSynchronous,
} from './opfs-pragmas';

export type { SqliteJournalMode, SqliteSynchronous } from './opfs-pragmas';

/** Config for in-process OPFS SQLite (worker-only, no MessagePort). */
export interface OpfsConfig extends WasmSqliteClient.SqliteClientMemoryConfig {
  readonly dbName: string;
  readonly vfsDirectory?: string;

  /**
   * Journal mode applied to every connection. Defaults to `wal`.
   * `wal` on {@link AccessHandlePoolVFS} requires exclusive locking because the VFS has no
   * shared-memory (`xShm`) support, so selecting `wal` also applies `PRAGMA locking_mode=EXCLUSIVE`.
   */
  readonly journalMode?: SqliteJournalMode;

  /**
   * Synchronous flag applied to every connection. Defaults to `normal`, which is corruption-safe
   * under WAL and avoids a per-commit fsync (`xSync` -> OPFS `flush`).
   */
  readonly synchronous?: SqliteSynchronous;
}

const ATTR_DB_SYSTEM_NAME = 'db.system.name';

const DEFAULT_VFS_DIRECTORY = 'opfs';

const initModule = Effect.runSync(Effect.cached(Effect.promise(() => SQLiteESMFactory())));

const initEffect = Effect.runSync(Effect.cached(initModule.pipe(Effect.map((module) => WaSqlite.Factory(module)))));

const registeredVfs = GlobalValue.globalValue('@dxos/sql-sqlite/opfs-vfs-registered', () => new Set<string>());

type Connection = SqlConnection.Connection & {
  export: Effect.Effect<Uint8Array, SqlError.SqlError>;
  import: (data: Uint8Array) => Effect.Effect<void, SqlError.SqlError>;
};

const vacuumDatabase = (sqlite3: ReturnType<typeof WaSqlite.Factory>, db: number): void => {
  for (const stmt of sqlite3.statements(db, 'VACUUM')) {
    let result = sqlite3.step(stmt);
    while (result === WaSqlite.SQLITE_ROW) {
      result = sqlite3.step(stmt);
    }
    if (result !== WaSqlite.SQLITE_DONE) {
      throw new Error('VACUUM failed while persisting imported database');
    }
  }
};

const importDatabase = (
  sqlite3: ReturnType<typeof WaSqlite.Factory>,
  db: number,
  data: Uint8Array,
  pragmaOptions: OpfsConfig,
): void => {
  sqlite3.deserialize(db, 'main', data, data.length, data.length, 1 | 2);
  vacuumDatabase(sqlite3, db);
  applyOpfsPragmas(sqlite3, db, {
    journalMode: pragmaOptions.journalMode ?? DEFAULT_JOURNAL_MODE,
    synchronous: pragmaOptions.synchronous ?? DEFAULT_SYNCHRONOUS,
  });
};

const recordSqliteQueryMetrics = (
  sql: string,
  params: ReadonlyArray<unknown>,
  resultCount: number,
  begin: number,
): void => {
  const end = performance.now();
  log('sqlite query', { sql, params, results: resultCount, time: end - begin });
  performance.measure(sql.slice(0, 128), {
    start: begin,
    end: end,
    detail: {
      devtools: {
        dataType: 'track-entry',
        track: 'Query',
        trackGroup: 'SQlite',
        color: 'tertiary-dark',
        properties: [
          ['sql', sql],
          ['params', params],
          ['resultCount', resultCount],
        ],
      },
    },
  });
};

/** In-process OPFS SQLite client for dedicated worker contexts (no MessagePort). */
export const makeOpfs = (
  options: OpfsConfig,
): Effect.Effect<WasmSqliteClient.SqliteClient, SqlError.SqlError, Scope.Scope | Reactivity.Reactivity> =>
  Effect.gen(function* () {
    const reactivity = yield* Reactivity.Reactivity;
    const compiler = Statement.makeCompilerSqlite(options.transformQueryNames);
    const transformRows = options.transformResultNames
      ? Statement.defaultTransforms(options.transformResultNames).array
      : undefined;
    const vfsDirectory = options.vfsDirectory ?? DEFAULT_VFS_DIRECTORY;
    const journalMode = options.journalMode ?? DEFAULT_JOURNAL_MODE;
    const synchronous = options.synchronous ?? DEFAULT_SYNCHRONOUS;

    const makeConnection = Effect.gen(function* () {
      const sqlite3 = yield* initEffect;
      if (!registeredVfs.has(vfsDirectory)) {
        registeredVfs.add(vfsDirectory);
        const factory = yield* initModule;
        const vfs = yield* Effect.promise(() => AccessHandlePoolVFS.create(vfsDirectory, factory));
        // AccessHandlePoolVFS is an untyped wa-sqlite example; vfs_register expects its VFS shape.
        sqlite3.vfs_register(vfs as any, false);
      }

      const db = yield* Effect.acquireRelease(
        Effect.try({
          try: () => sqlite3.open_v2(options.dbName, undefined, vfsDirectory),
          catch: (cause) => new SqlError.SqlError({ cause, message: 'Failed to open database' }),
        }),
        (handle) => Effect.sync(() => sqlite3.close(handle)),
      );

      yield* Effect.try({
        try: () => applyOpfsPragmas(sqlite3, db, { journalMode, synchronous }),
        catch: (cause) => new SqlError.SqlError({ cause, message: 'Failed to configure database PRAGMAs' }),
      });

      if (options.installReactivityHooks) {
        sqlite3.update_hook(db, (_op, _db, table, rowid) => {
          if (!table) {
            return;
          }
          reactivity.unsafeInvalidate({ [table]: [String(Number(rowid))] });
        });
      }

      const run = (sql: string, params: ReadonlyArray<unknown> = [], rowMode: 'object' | 'array' = 'object') =>
        Effect.try({
          try: () => {
            const results: Array<any> = [];
            const begin = performance.now();
            for (const stmt of sqlite3.statements(db, sql)) {
              let columns: Array<string> | undefined;
              // wa-sqlite bind_collection is typed for SQLiteCompatibleType[] only.
              sqlite3.bind_collection(stmt, params as any);
              while (sqlite3.step(stmt) === WaSqlite.SQLITE_ROW) {
                columns = columns ?? sqlite3.column_names(stmt);
                const row = sqlite3.row(stmt);
                if (rowMode === 'object') {
                  const obj: Record<string, unknown> = {};
                  for (let index = 0; index < columns!.length; index++) {
                    obj[columns![index]] = row[index];
                  }
                  results.push(obj);
                } else {
                  results.push(row);
                }
              }
            }
            recordSqliteQueryMetrics(sql, params, results.length, begin);
            return results;
          },
          catch: (cause) => {
            log('sqlite error', { error: cause, sql, params });
            return new SqlError.SqlError({ cause, message: 'Failed to execute statement' });
          },
        });

      return identity<Connection>({
        execute: (sql, params, rowTransform) =>
          rowTransform ? Effect.map(run(sql, params), rowTransform) : run(sql, params),
        executeRaw: (sql, params) => run(sql, params),
        executeValues: (sql, params) => run(sql, params, 'array'),
        executeUnprepared(sql, params, rowTransform) {
          return this.execute(sql, params, rowTransform);
        },
        executeStream: (sql, params, rowTransform) => {
          const stream = function* () {
            const begin = performance.now();
            let resultCount = 0;
            for (const stmt of sqlite3.statements(db, sql)) {
              let columns: Array<string> | undefined;
              sqlite3.bind_collection(stmt, params as any);
              while (sqlite3.step(stmt) === WaSqlite.SQLITE_ROW) {
                columns = columns ?? sqlite3.column_names(stmt);
                const row = sqlite3.row(stmt);
                const obj: Record<string, unknown> = {};
                for (let index = 0; index < columns!.length; index++) {
                  obj[columns![index]] = row[index];
                }
                resultCount++;
                yield obj;
              }
            }
            recordSqliteQueryMetrics(sql, params, resultCount, begin);
          };

          return Stream.suspend(() => Stream.fromIteratorSucceed(stream()[Symbol.iterator]())).pipe(
            rowTransform
              ? Stream.mapChunks((chunk) => Chunk.unsafeFromArray(rowTransform(Chunk.toReadonlyArray(chunk))))
              : identity,
            Stream.mapError((cause) => {
              log('sqlite error', { error: cause, sql, params });
              return new SqlError.SqlError({ cause, message: 'Failed to execute statement' });
            }),
          );
        },
        export: Effect.try({
          try: () => sqlite3.serialize(db, 'main'),
          catch: (cause) => new SqlError.SqlError({ cause, message: 'Failed to export database' }),
        }),
        import: (data: Uint8Array) =>
          Effect.try({
            try: () => {
              log('opfs import', { bytes: data.byteLength });
              importDatabase(sqlite3, db, data, options);
            },
            catch: (cause) => new SqlError.SqlError({ cause, message: 'Failed to import database' }),
          }),
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
      (yield* Client.make({
        acquirer,
        compiler,
        transactionAcquirer,
        spanAttributes: [
          ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
          [ATTR_DB_SYSTEM_NAME, 'sqlite'],
        ],
        transformRows,
      })) as Client.SqlClient,
      {
        // Object.assign widens unique symbol TypeId; same pattern as @effect/sql-sqlite-wasm makeMemory.
        [WasmSqliteClient.TypeId]: WasmSqliteClient.TypeId as WasmSqliteClient.TypeId,
        config: options,
        export: semaphore.withPermits(1)(connection.export),
        import: (data: Uint8Array) => semaphore.withPermits(1)(connection.import(data)),
      },
      // SqlClient.updateValues is incompatible with SqliteClient's `never`; Object.assign cannot narrow it.
    ) as unknown as WasmSqliteClient.SqliteClient;
  });

/** Layer providing in-process OPFS {@link WasmSqliteClient.SqliteClient}. */
export const layerOpfs = (
  config: OpfsConfig,
): Layer.Layer<WasmSqliteClient.SqliteClient | Client.SqlClient, SqlError.SqlError> =>
  Layer.scopedContext(
    Effect.map(makeOpfs(config), (client) =>
      Context.make(WasmSqliteClient.SqliteClient, client).pipe(Context.add(Client.SqlClient, client)),
    ),
  ).pipe(Layer.provide(Reactivity.layer));
