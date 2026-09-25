//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

// Code copied from @effect/sql-sqlite-wasm/OpfsWorker.ts and augmented with logging.

import * as WaSqlite from '@effect/wa-sqlite';
// oxlint-disable-next-line @dxos/rules/effect-subpath-imports
import SQLiteESMFactory from '@effect/wa-sqlite/dist/wa-sqlite.mjs';
import * as Effect from 'effect/Effect';
/**
 * @since 1.0.0
 */
/// <reference lib="webworker" />
import * as SqlError from 'effect/unstable/sql/SqlError';

import { log } from '@dxos/log';
// @ts-ignore
import { AccessHandlePoolVFS } from '@dxos/wa-sqlite/src/examples/AccessHandlePoolVFS.js';

import {
  DEFAULT_JOURNAL_MODE,
  DEFAULT_SYNCHRONOUS,
  type SqliteJournalMode,
  type SqliteSynchronous,
  applyOpfsPragmas,
  checkpointWal,
} from './internal/opfs-pragmas.ts';
import { recordSqliteQueryMetrics } from './internal/query-log.ts';
import { readRow } from './internal/row-decode.ts';
import { instantiateSqliteModule } from './internal/sqlite-module.ts';

/** @internal */
type OpfsWorkerMessage =
  | [id: number, sql: string, params: ReadonlyArray<unknown>]
  | ['import', id: number, data: Uint8Array]
  | ['export', id: number]
  | ['update_hook']
  | ['close'];

/**
 * @category models
 * @since 1.0.0
 */
export interface OpfsWorkerConfig {
  readonly port: EventTarget & Pick<MessagePort, 'postMessage' | 'close'>;
  readonly dbName: string;
  readonly journalMode?: SqliteJournalMode;
  readonly synchronous?: SqliteSynchronous;
}

/**
 * Failure mode: `AccessHandlePoolVFS` claims exclusive OPFS sync access handles for `dbName`, and
 * OPFS access handles are exclusive per file across the whole origin — not just per worker. If two
 * independent instances of this worker try to open the same `dbName` concurrently (e.g. one per
 * browser tab, each spun up directly via a plain `createOpfsWorker` factory with no cross-tab
 * coordination), the second instance's `open_v2` blocks or fails outright, effectively locking that
 * tab out. Callers that need multi-tab persistence must run this worker behind a single elected
 * leader instead of one-per-tab — see `Runtime.Client.ServicesMode.DEDICATED_WORKER` and
 * `SharedWorkerCoordinator` in `@dxos/client`, which arbitrate leadership via `navigator.locks` and
 * a coordinator `SharedWorker` so only the leader's dedicated worker ever touches OPFS.
 *
 * @category constructor
 * @since 1.0.0
 */
export const run = (options: OpfsWorkerConfig): Effect.Effect<void, SqlError.SqlError> =>
  Effect.gen(function* () {
    const factory = yield* Effect.promise(() => instantiateSqliteModule(SQLiteESMFactory));
    const sqlite3 = WaSqlite.Factory(factory);
    const vfs = yield* Effect.promise(() => AccessHandlePoolVFS.create('opfs', factory));
    sqlite3.vfs_register(vfs as any, false);
    let shutdownRequested = false;
    const db = yield* Effect.acquireRelease(
      Effect.try({
        try: () => {
          const handle = sqlite3.open_v2(options.dbName, undefined, 'opfs');
          applyOpfsPragmas(sqlite3, handle, {
            journalMode: options.journalMode ?? DEFAULT_JOURNAL_MODE,
            synchronous: options.synchronous ?? DEFAULT_SYNCHRONOUS,
          });
          return handle;
        },
        catch: (cause) =>
          new SqlError.SqlError({
            reason: SqlError.classifySqliteError(cause, { message: 'Failed to open database' }),
          }),
      }),
      (handle) =>
        Effect.sync(() => {
          sqlite3.close(handle);
          if (shutdownRequested) {
            options.port.postMessage(['closed', undefined, undefined]);
          }
        }),
    );

    return yield* Effect.callback<void>((resume) => {
      const onMessage = (event: any) => {
        let messageId: number;
        let lastSql: string | undefined;
        let lastParams: ReadonlyArray<unknown> | undefined;
        const message = event.data as OpfsWorkerMessage;
        try {
          switch (message[0]) {
            case 'close': {
              shutdownRequested = true;
              return resume(Effect.void);
            }
            case 'import': {
              const [, id, data] = message;
              messageId = id;
              log('opfs import', { bytes: data.byteLength });
              sqlite3.deserialize(db, 'main', data, data.length, data.length, 1 | 2);
              for (const stmt of sqlite3.statements(db, 'VACUUM')) {
                let result = sqlite3.step(stmt);
                while (result === WaSqlite.SQLITE_ROW) {
                  result = sqlite3.step(stmt);
                }
                if (result !== WaSqlite.SQLITE_DONE) {
                  throw new Error('VACUUM failed while persisting imported database');
                }
              }
              applyOpfsPragmas(sqlite3, db, {
                journalMode: options.journalMode ?? DEFAULT_JOURNAL_MODE,
                synchronous: options.synchronous ?? DEFAULT_SYNCHRONOUS,
              });
              options.port.postMessage([id, void 0, void 0]);
              return;
            }
            case 'export': {
              const [, id] = message;
              messageId = id;
              // Checkpoint so the snapshot reflects all committed WAL frames and the on-disk
              // main file is left authoritative (raw pool reads stay correct).
              checkpointWal(sqlite3, db);
              const data = sqlite3.serialize(db, 'main');
              options.port.postMessage([id, undefined, data], [data.buffer]);
              return;
            }
            case 'update_hook': {
              messageId = -1;
              sqlite3.update_hook(db, (_op, _db, table, rowid) => {
                if (!table) {
                  return;
                }
                options.port.postMessage(['update_hook', table, Number(rowid)]);
              });
              return;
            }
            default: {
              const [id, sql, params] = message;
              messageId = id;
              lastSql = sql;
              lastParams = params;
              const results: Array<any> = [];
              const begin = performance.now();
              // Column names ride per row rather than once per reply: a multi-statement query returns
              // rows from statements with different columns, and the client pairs them by index.
              const columns: Array<Array<string>> = [];
              for (const stmt of sqlite3.statements(db, sql)) {
                let statementColumns: Array<string> | undefined;
                sqlite3.bind_collection(stmt, params as any);
                while (sqlite3.step(stmt) === WaSqlite.SQLITE_ROW) {
                  const decoded = readRow(sqlite3, stmt, sql, statementColumns);
                  statementColumns = decoded.columns;
                  results.push(decoded.row);
                  columns.push(statementColumns);
                }
              }
              options.port.postMessage([id, undefined, [columns, results]]);
              recordSqliteQueryMetrics(sql, params, results.length, begin);
              return;
            }
          }
        } catch (e: any) {
          // Logged at debug level: SQL errors are returned to the caller via postMessage,
          // and some are expected (e.g. ALTER TABLE ADD COLUMN against an already-migrated DB).
          log('sqlite error', { error: e, sql: lastSql, params: lastParams });
          const message = 'message' in e ? e.message : String(e);
          // The client classifies SqlError reasons from `code`, which a bare string would drop.
          const error = typeof e.code === 'number' ? { message, code: e.code } : message;
          options.port.postMessage([messageId!, error, undefined]);
        }
      };
      options.port.addEventListener('message', onMessage);
      options.port.postMessage(['ready', undefined, undefined]);
      return Effect.sync(() => {
        options.port.removeEventListener('message', onMessage);
      });
    });
  }).pipe(Effect.scoped);
