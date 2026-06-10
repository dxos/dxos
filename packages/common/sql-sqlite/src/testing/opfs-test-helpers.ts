//
// Copyright 2026 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { isValidSqliteDatabase, OPFS_SQLITE_DB_FILENAME, readOpfsSqliteDatabase, writeOpfsSqliteDatabase } from '../internal/opfs-pool-async';
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

type InWorkerRequest = ['run', testCase: string, payload?: string | Uint8Array];

type InWorkerResponse = ['ready'] | ['result', unknown] | ['error', string];

/** Dedicated worker running {@link SqliteClient.layerOpfs} (Composer dedicated-worker path). */
export const spawnInWorkerTestRunner = (): Worker =>
  new Worker(new URL('./opfs-in-worker-test-worker.ts', import.meta.url), { type: 'module' });

const waitForInWorkerResponse = (
  worker: Worker,
  predicate: (message: InWorkerResponse) => boolean,
  timeoutMs = 60_000,
): Promise<InWorkerResponse> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.removeEventListener('message', onMessage);
      reject(new Error('In-worker test runner timed out'));
    }, timeoutMs);

    const onMessage = (event: MessageEvent<InWorkerResponse>) => {
      const message = event.data;
      if (predicate(message)) {
        clearTimeout(timeout);
        worker.removeEventListener('message', onMessage);
        resolve(message);
      }
    };

    worker.addEventListener('message', onMessage);
  });

export const waitForInWorkerTestRunner = async (worker: Worker): Promise<void> => {
  await waitForInWorkerResponse(worker, ([type]) => type === 'ready');
};

export const runInWorkerTestCase = async (
  worker: Worker,
  testCase: string,
  payload?: string | Uint8Array,
): Promise<unknown> => {
  const responsePromise = waitForInWorkerResponse(worker, ([type]) => type === 'result' || type === 'error');

  if (payload instanceof Uint8Array) {
    const copy = new Uint8Array(payload.byteLength);
    copy.set(payload);
    worker.postMessage(['run', testCase, copy] satisfies InWorkerRequest, [copy.buffer]);
  } else {
    worker.postMessage(['run', testCase, payload] satisfies InWorkerRequest);
  }

  const response = await responsePromise;
  if (response[0] === 'error') {
    throw new Error(response[1]);
  }
  return response[1];
};

export const terminateInWorkerTestRunner = (worker: Worker): void => {
  worker.terminate();
};

/** HALO control feed key used in post-import hypercore write tests. */
export const TEST_HALO_CONTROL_FEED_KEY =
  '04aab642ba5cbfc0c0ec503233c904b02dfb32e5b87290beaabfe9b5ac9913f09ff06496f1240c6153b87f3464f73c51e703afb745ba6312a7833e15b306c28f4c';

/**
 * Seed a profile-like schema, export via async pool read, re-import via raw pool write,
 * then open a fresh layerOpfs worker and write hypercore_files (Composer boot path).
 */
export const seedExportPoolImportAndHypercoreWrite = async (): Promise<unknown> => {
  const seedWorker = spawnInWorkerTestRunner();
  try {
    await waitForInWorkerTestRunner(seedWorker);
    await runInWorkerTestCase(seedWorker, 'seed-hypercore-profile');
  } finally {
    terminateInWorkerTestRunner(seedWorker);
  }

  const exported = await readOpfsSqliteDatabase(OPFS_SQLITE_DB_FILENAME);
  if (!isValidSqliteDatabase(exported)) {
    throw new Error('Exported OPFS payload is not a valid SQLite database');
  }

  await writeOpfsSqliteDatabase(exported, OPFS_SQLITE_DB_FILENAME);

  const writeWorker = spawnInWorkerTestRunner();
  try {
    await waitForInWorkerTestRunner(writeWorker);
    return await runInWorkerTestCase(writeWorker, 'hypercore-write-after-import');
  } finally {
    terminateInWorkerTestRunner(writeWorker);
  }
};

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
