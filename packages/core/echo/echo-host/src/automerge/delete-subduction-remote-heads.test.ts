//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import { describe, expect, onTestFinished, test } from 'vitest';

import { RuntimeProvider } from '@dxos/effect';
import { bufferToArray } from '@dxos/util';

import { type TestSqliteRuntime, createTestSqliteRuntime } from '../testing/index.ts';
import { deleteSubductionRemoteHeads } from './delete-subduction-remote-heads.ts';
import { SqliteStorageAdapter } from './sqlite-storage-adapter.ts';

describe('deleteSubductionRemoteHeads', () => {
  const setup = async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    const adapter = new SqliteStorageAdapter({ runtime });
    await adapter.open?.();
    await RuntimeProvider.runPromise(runtime)(adapter.migrate);
    onTestFinished(async () => {
      await adapter.close?.();
      await dispose();
    });
    return { adapter, runtime };
  };

  const remoteHeads = ['sid1', 'sid2'].flatMap((sedimentreeId) =>
    ['peerA', 'peerB', 'peerC'].map((peerId) => ['subduction', 'remote-heads', sedimentreeId, peerId]),
  );

  const unrelated = [
    ['subduction', 'ids', 'sid1'],
    ['subduction', 'commits', 'sid1', 'commit1'],
    ['subduction', 'blobs', 'sid1', 'blob1'],
    ['subduction', 'remote-headsX', 'sid1', 'peerA'], // Family that merely starts with the same text.
    ['doc1', 'incremental', 'hash1'],
  ];

  // Enough classical chunks that the rows outside the range outnumber the records, which selects in-place deletion.
  const documentChunks = Array.from({ length: 8 }, (_, index) => ['doc2', 'incremental', `hash${index}`]);

  const seed = async (adapter: SqliteStorageAdapter, keys: string[][]) => {
    for (const key of keys) {
      await adapter.save(key, bufferToArray(Buffer.from(key.join('/'))));
    }
  };

  const expectIntact = async (adapter: SqliteStorageAdapter, keys: string[][]) => {
    for (const key of keys) {
      expect(await adapter.load(key), key.join('/')).toEqual(bufferToArray(Buffer.from(key.join('/'))));
    }
  };

  const deleteWithProgress = async (runtime: TestSqliteRuntime['runtime'], options: { batchSize?: number } = {}) => {
    const progress: { deleted: number; total: number }[] = [];
    const result = await RuntimeProvider.runPromise(runtime)(
      deleteSubductionRemoteHeads({ ...options, onProgress: (update) => progress.push(update) }),
    );
    return { ...result, progress };
  };

  test('rebuilds the table when the records outnumber the other rows, keeping every other row', async () => {
    const { adapter, runtime } = await setup();
    await seed(adapter, [...remoteHeads, ...unrelated]);
    // SQLite allows a NULL key here, and it lies outside the range, so the rebuild has to keep it.
    await RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`INSERT INTO automerge_chunks (key, data) VALUES (NULL, ${new Uint8Array([7])})`;
      }),
    );

    const { deleted, progress } = await deleteWithProgress(runtime, { batchSize: 4 });

    expect(deleted).toBe(6);
    expect(progress).toEqual([
      { deleted: 0, total: 6 },
      { deleted: 6, total: 6 },
    ]);
    expect(await adapter.loadRange(['subduction', 'remote-heads'])).toEqual([]);
    await expectIntact(adapter, unrelated);
    const [leftovers] = await RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ nullKeys: number; stagingTables: number }>`
          SELECT
            (SELECT count(*) FROM automerge_chunks WHERE key IS NULL) AS nullKeys,
            (SELECT count(*) FROM sqlite_schema WHERE name = 'automerge_chunks_repair') AS stagingTables
        `;
      }),
    );
    expect(leftovers).toEqual({ nullKeys: 1, stagingTables: 0 });
  });

  test('deletes in batches when the other rows outnumber the records', async () => {
    const { adapter, runtime } = await setup();
    await seed(adapter, [...remoteHeads, ...unrelated, ...documentChunks]);

    const { deleted, progress } = await deleteWithProgress(runtime, { batchSize: 4 });

    expect(deleted).toBe(6);
    expect(progress).toEqual([
      { deleted: 0, total: 6 },
      { deleted: 4, total: 6 },
      { deleted: 6, total: 6 },
    ]);
    expect(await adapter.loadRange(['subduction', 'remote-heads'])).toEqual([]);
    await expectIntact(adapter, [...unrelated, ...documentChunks]);
  });

  test('a batch size that divides the range exactly counts every row once', async () => {
    const { adapter, runtime } = await setup();
    await seed(adapter, [...remoteHeads, ...documentChunks]);

    const { deleted, progress } = await deleteWithProgress(runtime, { batchSize: 3 });

    expect(deleted).toBe(6);
    expect(progress).toEqual([
      { deleted: 0, total: 6 },
      { deleted: 3, total: 6 },
      { deleted: 6, total: 6 },
    ]);
    expect(await adapter.loadRange(['subduction', 'remote-heads'])).toEqual([]);
  });

  test('a store without remote-heads records is left as is', async () => {
    const { adapter, runtime } = await setup();
    await seed(adapter, unrelated);

    const { deleted, progress } = await deleteWithProgress(runtime);

    expect(deleted).toBe(0);
    expect(progress).toEqual([]);
    await expectIntact(adapter, unrelated);
  });
});
