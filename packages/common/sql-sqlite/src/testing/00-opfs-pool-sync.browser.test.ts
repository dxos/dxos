//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

// @ts-expect-error - No type declarations for this module.
import * as WaSqlite from '@dxos/wa-sqlite';
// @ts-expect-error - No type declarations for this module.
import SQLiteESMFactory from '@dxos/wa-sqlite/dist/wa-sqlite.mjs';

import * as OpfsPool from '../OpfsPool';

const wasmUrl = new URL('@dxos/wa-sqlite/dist/wa-sqlite.wasm', import.meta.url).href;

type PoolWorkerInbound = ['ready', undefined, undefined] | [id: number, error: string | undefined, results: unknown];

const createSerializedDatabase = async (): Promise<Uint8Array> => {
  const factory = await SQLiteESMFactory({
    locateFile: (path: string) => (path.endsWith('.wasm') ? wasmUrl : path),
  });
  const sqlite3 = WaSqlite.Factory(factory);
  const db = sqlite3.open_v2(':memory:', WaSqlite.SQLITE_OPEN_READWRITE | WaSqlite.SQLITE_OPEN_CREATE);
  sqlite3.exec(db, 'CREATE TABLE items (id INTEGER PRIMARY KEY, label TEXT)');
  sqlite3.exec(db, "INSERT INTO items (label) VALUES ('sync-pool')");
  const data = sqlite3.serialize(db, 'main');
  sqlite3.close(db);
  return data;
};

const writeViaPoolWorker = async (database: Uint8Array): Promise<void> => {
  const worker = new Worker(new URL('./opfs-pool-sync-worker.ts', import.meta.url), { type: 'module' });

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('OPFS pool worker ready timed out')), 30_000);
      const onMessage = (event: MessageEvent<PoolWorkerInbound>) => {
        if (event.data[0] === 'ready') {
          clearTimeout(timeout);
          worker.removeEventListener('message', onMessage);
          resolve();
        }
      };
      worker.addEventListener('message', onMessage);
    });

    const writeId = 1;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('OPFS pool worker write timed out')), 30_000);
      const onMessage = (event: MessageEvent<PoolWorkerInbound>) => {
        const [id, error] = event.data;
        if (id !== writeId) {
          return;
        }
        clearTimeout(timeout);
        worker.removeEventListener('message', onMessage);
        if (error) {
          reject(new Error(error));
          return;
        }
        resolve();
      };
      worker.addEventListener('message', onMessage);

      const copy = new Uint8Array(database.byteLength);
      copy.set(database);
      worker.postMessage(['write', writeId, copy]);
    });
  } finally {
    worker.postMessage(['close']);
    worker.terminate();
  }
};

describe('opfs-pool-sync browser test', { timeout: 60_000 }, () => {
  test('writePoolSqlitePayload round-trips via async OPFS read', async () => {
    const source = await createSerializedDatabase();
    expect(OpfsPool.isValidSqliteDatabase(source)).toBe(true);

    await writeViaPoolWorker(source);

    const payload = await OpfsPool.readDatabase(OpfsPool.DEFAULT_DB_FILENAME);
    expect(OpfsPool.isValidSqliteDatabase(payload)).toBe(true);
    expect(payload.byteLength).toBeGreaterThanOrEqual(source.byteLength);

    const pool = await OpfsPool.listFiles();
    const dxos = pool.find((entry) => entry.associatedPath === `/${OpfsPool.DEFAULT_DB_FILENAME}`);
    expect(dxos).toBeDefined();
    expect(dxos!.payloadBytes).toBeGreaterThanOrEqual(source.byteLength);
  });
});
