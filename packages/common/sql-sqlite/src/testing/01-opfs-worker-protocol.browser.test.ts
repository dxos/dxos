//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as OpfsPool from '../OpfsPool';
import {
  createSerializedDatabase,
  runSqlOnWorker,
  shutdownWorker,
  spawnOpfsWorker,
  waitForWorkerMessage,
} from './opfs-test-helpers';

describe('opfs-worker protocol browser test', { timeout: 60_000, sequential: true }, () => {
  test('imports serialized database via worker import message', async () => {
    const source = await createSerializedDatabase();
    const worker = spawnOpfsWorker();

    try {
      await waitForWorkerMessage(worker, ([id]) => id === 'ready');

      const importId = 1;
      const importCopy = new Uint8Array(source.byteLength);
      importCopy.set(source);
      const importPromise = waitForWorkerMessage(worker, ([id]) => id === importId);
      worker.postMessage(['import', importId, importCopy], [importCopy.buffer]);
      const [, importError] = await importPromise;
      expect(importError).toBeUndefined();

      const queryId = 2;
      const queryPromise = waitForWorkerMessage(worker, ([id]) => id === queryId);
      worker.postMessage([queryId, 'SELECT label FROM items ORDER BY id', []]);
      const [, queryError, results] = await queryPromise;
      expect(queryError).toBeUndefined();

      const [columns, rows] = results as [string[], unknown[][]];
      expect(columns).toContain('label');
      expect(rows).toHaveLength(1);
      expect(rows[0]?.[columns.indexOf('label')]).toBe('imported');
    } finally {
      await shutdownWorker(worker);
    }
  });

  test('exports database via worker export message', async () => {
    const worker = spawnOpfsWorker();

    try {
      await waitForWorkerMessage(worker, ([id]) => id === 'ready');
      await runSqlOnWorker(worker, 1, 'CREATE TABLE IF NOT EXISTS export_probe (value TEXT)');
      await runSqlOnWorker(worker, 2, "INSERT INTO export_probe (value) VALUES ('snapshot')");

      const exportId = 3;
      const exportPromise = waitForWorkerMessage(worker, ([id]) => id === exportId);
      worker.postMessage(['export', exportId]);
      const [, exportError, snapshot] = await exportPromise;
      expect(exportError).toBeUndefined();
      expect(snapshot).toBeInstanceOf(Uint8Array);
      expect(OpfsPool.isValidSqliteDatabase(snapshot as Uint8Array)).toBe(true);
    } finally {
      await shutdownWorker(worker);
    }
  });

  test('export checkpoints committed WAL frames into the raw pool main file', async () => {
    // Worker A: write data (committed to the WAL), export (triggers wal_checkpoint(TRUNCATE)),
    // then read the raw on-disk main file while A is still alive — before any close-time checkpoint.
    const workerA = spawnOpfsWorker();
    let payloadDuringSession: Uint8Array;
    try {
      await waitForWorkerMessage(workerA, ([id]) => id === 'ready');
      await runSqlOnWorker(workerA, 1, 'CREATE TABLE IF NOT EXISTS checkpoint_probe (value TEXT)');
      await runSqlOnWorker(workerA, 2, "INSERT INTO checkpoint_probe (value) VALUES ('committed-via-wal')");

      const exportId = 3;
      const exportPromise = waitForWorkerMessage(workerA, ([id]) => id === exportId);
      workerA.postMessage(['export', exportId]);
      const [, exportError] = await exportPromise;
      expect(exportError).toBeUndefined();

      payloadDuringSession = await OpfsPool.readDatabase(OpfsPool.DEFAULT_DB_FILENAME);
      expect(OpfsPool.isValidSqliteDatabase(payloadDuringSession)).toBe(true);
    } finally {
      await shutdownWorker(workerA);
    }

    // Worker B: re-import the captured raw payload and confirm the committed row survived,
    // proving export flushed the WAL into the main file (not lost in a `-wal` sidecar).
    const workerB = spawnOpfsWorker();
    try {
      await waitForWorkerMessage(workerB, ([id]) => id === 'ready');

      const importId = 1;
      const importCopy = new Uint8Array(payloadDuringSession.byteLength);
      importCopy.set(payloadDuringSession);
      const importPromise = waitForWorkerMessage(workerB, ([id]) => id === importId);
      workerB.postMessage(['import', importId, importCopy], [importCopy.buffer]);
      const [, importError] = await importPromise;
      expect(importError).toBeUndefined();

      const queryId = 2;
      const queryPromise = waitForWorkerMessage(workerB, ([id]) => id === queryId);
      workerB.postMessage([queryId, 'SELECT value FROM checkpoint_probe ORDER BY rowid', []]);
      const [, queryError, results] = await queryPromise;
      expect(queryError).toBeUndefined();
      const [, rows] = results as [string[], unknown[][]];
      expect(rows).toEqual([['committed-via-wal']]);
    } finally {
      await shutdownWorker(workerB);
    }
  });
});
