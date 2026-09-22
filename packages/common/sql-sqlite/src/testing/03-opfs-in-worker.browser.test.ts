//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as OpfsPool from '../OpfsPool.ts';
import {
  createSerializedDatabase,
  runInWorkerTestCase,
  seedExportPoolImportAndHypercoreWrite,
  spawnInWorkerTestRunner,
  terminateInWorkerTestRunner,
  waitForInWorkerTestRunner,
} from './opfs-test-helpers.ts';

describe('opfs in-worker SqliteClient browser test', { timeout: 120_000, sequential: true }, () => {
  test('runs CRUD inside dedicated worker via SqliteClient.layerOpfs', async () => {
    const worker = spawnInWorkerTestRunner();
    try {
      await waitForInWorkerTestRunner(worker);
      const result = (await runInWorkerTestCase(worker, 'crud')) as { names: string[] };
      expect(result.names).toEqual(['Alice', 'Bob']);
    } finally {
      terminateInWorkerTestRunner(worker);
    }
  });

  test('exports database inside worker via SqliteClient.layerOpfs', async () => {
    const worker = spawnInWorkerTestRunner();
    try {
      await waitForInWorkerTestRunner(worker);
      const result = (await runInWorkerTestCase(worker, 'export')) as { byteLength: number; valid: boolean };
      expect(result.byteLength).toBeGreaterThan(100);
      expect(result.valid).toBe(true);
    } finally {
      terminateInWorkerTestRunner(worker);
    }
  });

  test('imports snapshot inside worker via SqliteClient.layerOpfs', async () => {
    const source = await createSerializedDatabase('in-worker-import');
    expect(OpfsPool.isValidSqliteDatabase(source)).toBe(true);

    const worker = spawnInWorkerTestRunner();
    try {
      await waitForInWorkerTestRunner(worker);
      const result = (await runInWorkerTestCase(worker, 'import', source)) as { label: string };
      expect(result.label).toBe('in-worker-import');
    } finally {
      terminateInWorkerTestRunner(worker);
    }
  });

  test('exports and re-imports inside worker via SqliteClient.layerOpfs', async () => {
    const worker = spawnInWorkerTestRunner();
    try {
      await waitForInWorkerTestRunner(worker);
      const result = (await runInWorkerTestCase(worker, 'import-roundtrip')) as { value: string };
      expect(result.value).toBe('roundtrip');
    } finally {
      terminateInWorkerTestRunner(worker);
    }
  });

  test('persists OPFS data across in-worker client restart', async () => {
    const marker = `in-worker-persist-${crypto.randomUUID()}`;

    const writeWorker = spawnInWorkerTestRunner();
    try {
      await waitForInWorkerTestRunner(writeWorker);
      const written = (await runInWorkerTestCase(writeWorker, 'persist-write', marker)) as { written: string };
      expect(written.written).toBe(marker);
    } finally {
      terminateInWorkerTestRunner(writeWorker);
    }

    const readWorker = spawnInWorkerTestRunner();
    try {
      await waitForInWorkerTestRunner(readWorker);
      const read = (await runInWorkerTestCase(readWorker, 'persist-read')) as { marker: string };
      expect(read.marker).toBe(marker);
    } finally {
      terminateInWorkerTestRunner(readWorker);
    }
  });

  /**
   * The page size the production OPFS path actually opens with, which decides what a write costs.
   *
   * An OPFS write costs per CALL rather than per byte (~1.2 ms measured), and a WAL frame is issued
   * as TWO calls — its 24-byte header and then the page — so the perf flow sees writes averaging
   * exactly (4096 + 24) / 2 = 2,060 bytes and one typed sentence costs ~760 calls. Asserted rather
   * than described because halving that call count is a page-size change, and a `PRAGMA page_size`
   * issued after the database exists is silently ignored: this is the number that says whether such
   * a change reached the database or not.
   */
  test('reports the page size and journal mode the OPFS client opens with', async () => {
    const worker = spawnInWorkerTestRunner();
    try {
      await waitForInWorkerTestRunner(worker);
      const result = (await runInWorkerTestCase(worker, 'page-size', `page-size-${crypto.randomUUID()}`)) as {
        pageSize: number;
        journalMode: string;
      };
      expect(result.journalMode).toBe('wal');
      expect(result.pageSize).toBe(8192);
    } finally {
      terminateInWorkerTestRunner(worker);
    }
  });

  test('writes hypercore_files via layerOpfs after raw pool import', async () => {
    const result = (await seedExportPoolImportAndHypercoreWrite()) as {
      previousCount: number;
      writtenBytes: number;
    };
    expect(result.writtenBytes).toBe(4);
  });
});
