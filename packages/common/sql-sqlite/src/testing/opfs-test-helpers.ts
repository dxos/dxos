//
// Copyright 2026 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { isValidSqliteDatabase } from '../opfs-pool-async';
import * as SqliteClient from '../SqliteClient';

const wasmUrl = new URL('@dxos/wa-sqlite/dist/wa-sqlite.wasm', import.meta.url).href;

export type WorkerInbound =
  | ['ready', undefined, undefined]
  | [id: number | 'closed', error: string | undefined, results: unknown];

/** Build a small in-memory SQLite file for import tests. */
export const createSerializedDatabase = async (label = 'imported'): Promise<Uint8Array> => {
  // @ts-expect-error - No type declarations for this module.
  const WaSqlite = await import('@dxos/wa-sqlite');
  // @ts-expect-error - No type declarations for this module.
  const SQLiteESMFactory = (await import('@dxos/wa-sqlite/dist/wa-sqlite.mjs')).default;

  const factory = await SQLiteESMFactory({
    locateFile: (path: string) => (path.endsWith('.wasm') ? wasmUrl : path),
  });
  const sqlite3 = WaSqlite.Factory(factory);
  const db = sqlite3.open_v2(':memory:', WaSqlite.SQLITE_OPEN_READWRITE | WaSqlite.SQLITE_OPEN_CREATE);
  sqlite3.exec(db, 'CREATE TABLE items (id INTEGER PRIMARY KEY, label TEXT)');
  sqlite3.exec(db, `INSERT INTO items (label) VALUES ('${label}')`);
  const data = sqlite3.serialize(db, 'main');
  sqlite3.close(db);
  return data;
};

export const waitForWorkerMessage = (
  worker: Worker,
  predicate: (message: WorkerInbound) => boolean,
  timeoutMs = 30_000,
): Promise<WorkerInbound> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.removeEventListener('message', onMessage);
      reject(new Error('OPFS worker message timed out'));
    }, timeoutMs);

    const onMessage = (event: MessageEvent<WorkerInbound>) => {
      const message = event.data;
      if (predicate(message)) {
        clearTimeout(timeout);
        worker.removeEventListener('message', onMessage);
        resolve(message);
      }
    };

    worker.addEventListener('message', onMessage);
  });

/** Close the OPFS worker and release sync access handles. */
export const shutdownWorker = async (worker: Worker): Promise<void> => {
  worker.postMessage(['close']);
  await waitForWorkerMessage(worker, ([id]) => id === 'closed', 10_000).catch(() => undefined);
  worker.terminate();
};

export const spawnOpfsWorker = (): Worker =>
  new Worker(new URL('./opfs-worker.ts', import.meta.url), { type: 'module' });

export const runSqlOnWorker = async (
  worker: Worker,
  id: number,
  sql: string,
  params: unknown[] = [],
): Promise<void> => {
  const promise = waitForWorkerMessage(worker, ([messageId]) => messageId === id);
  worker.postMessage([id, sql, params]);
  const [, error] = await promise;
  if (error) {
    throw new Error(error);
  }
};

/** Copy export bytes before ArrayBuffer transfer detaches the original. */
export const copySqliteSnapshot = (snapshot: Uint8Array): Uint8Array<ArrayBuffer> => {
  const copy = new Uint8Array(snapshot.byteLength);
  copy.set(snapshot);
  return copy;
};

/**
 * Run an Effect program against a real OPFS SqliteClient, then shut down the worker.
 */
export const runWithOpfsSqliteClient = <A, E>(
  program: Effect.Effect<A, E, SqlClient.SqlClient | SqliteClient.SqliteClient>,
): Promise<A> =>
  Effect.gen(function* () {
    const worker = yield* Effect.acquireRelease(
      Effect.sync(() => spawnOpfsWorker()),
      (activeWorker) => Effect.promise(() => shutdownWorker(activeWorker)),
    );

    const layer = SqliteClient.layer({
      worker: Effect.succeed(worker),
    }).pipe(Layer.provideMerge(Reactivity.layer));

    return yield* program.pipe(Effect.provide(layer));
  }).pipe(Effect.scoped, Effect.runPromise);

export { isValidSqliteDatabase };
