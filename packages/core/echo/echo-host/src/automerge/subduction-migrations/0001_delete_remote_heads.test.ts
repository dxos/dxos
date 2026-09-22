//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, onTestFinished, test } from 'vitest';

import { RuntimeProvider } from '@dxos/effect';
import { bufferToArray } from '@dxos/util';

import { type TestSqliteRuntime, createTestSqliteRuntime } from '../../testing/index.ts';
import { SqliteStorageAdapter } from '../sqlite-storage-adapter.ts';
import { deleteSubductionRemoteHeads } from './0001_delete_remote_heads.ts';

describe('deleteSubductionRemoteHeads', () => {
  const setup = async ({ onDisk = false }: { onDisk?: boolean } = {}) => {
    const directory = onDisk ? mkdtempSync(join(tmpdir(), 'dxos-remote-heads-')) : undefined;
    const { runtime, dispose } = createTestSqliteRuntime(directory ? join(directory, 'chunks.db') : undefined);
    const adapter = new SqliteStorageAdapter({ runtime });
    await adapter.open?.();
    await RuntimeProvider.runPromise(runtime)(adapter.migrate);
    onTestFinished(async () => {
      await adapter.close?.();
      await dispose();
      if (directory) {
        rmSync(directory, { recursive: true, force: true });
      }
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

  const bulky = Array.from({ length: 300 }, (_, index) => ['subduction', 'remote-heads', `sid${index}`, 'peer']);

  const fileBytes = (runtime: TestSqliteRuntime['runtime']) =>
    RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const [row] = yield* sql<{ bytes: number; freelist: number }>`
          SELECT page_count * page_size AS bytes, freelist_count AS freelist
          FROM pragma_page_count(), pragma_page_size(), pragma_freelist_count()
        `;
        return row;
      }),
    );

  // Both strategies leave the freed pages on SQLite's freelist, so without the vacuum a 700 MB profile stays 700 MB.
  test.each([
    { strategy: 'rebuild', others: [] as string[][] },
    { strategy: 'in place', others: Array.from({ length: 400 }, (_, index) => ['doc3', 'incremental', `h${index}`]) },
  ])('shrinks the file after deleting ($strategy)', async ({ others }) => {
    const { adapter, runtime } = await setup({ onDisk: true });
    for (const key of bulky) {
      await adapter.save(key, new Uint8Array(4_096));
    }
    await seed(adapter, [...unrelated, ...others]);
    const before = await fileBytes(runtime);

    const { deleted, reclaimedBytes } = await RuntimeProvider.runPromise(runtime)(deleteSubductionRemoteHeads());

    const after = await fileBytes(runtime);
    expect(deleted).toBe(bulky.length);
    expect(after.freelist).toBe(0);
    expect(after.bytes).toBeLessThan(before.bytes / 2);
    // Measured from after the delete, whose staging table moves the count by a page, to after the vacuum.
    expect(reclaimedBytes).toBeGreaterThan(before.bytes / 2);
    expect(reclaimedBytes).toBeLessThanOrEqual(before.bytes - after.bytes + 2 * 4_096);
    await expectIntact(adapter, [...unrelated, ...others]);
  });

  // The delete commits before the vacuum, so a run stopped in between leaves nothing to delete but everything to
  // reclaim; the rerun must not take its own empty delete as a reason to skip the vacuum.
  test('a rerun after an interrupted vacuum still reclaims the space', async () => {
    const { adapter, runtime } = await setup({ onDisk: true });
    for (const key of bulky) {
      await adapter.save(key, new Uint8Array(4_096));
    }
    await seed(adapter, unrelated);
    const first = await RuntimeProvider.runPromise(runtime)(deleteSubductionRemoteHeads({ vacuum: false }));
    expect(first).toEqual({ deleted: bulky.length, reclaimedBytes: 0 });
    const before = await fileBytes(runtime);
    expect(before.freelist).toBeGreaterThan(0);

    const rerun = await RuntimeProvider.runPromise(runtime)(deleteSubductionRemoteHeads());

    expect(rerun.deleted).toBe(0);
    expect(rerun.reclaimedBytes).toBeGreaterThan(before.bytes / 2);
    expect((await fileBytes(runtime)).freelist).toBe(0);
    await expectIntact(adapter, unrelated);
  });

  test('a file without free pages is not vacuumed', async () => {
    const { adapter, runtime } = await setup();
    await seed(adapter, unrelated);
    const before = await fileBytes(runtime);
    expect(before.freelist).toBe(0);

    const result = await RuntimeProvider.runPromise(runtime)(deleteSubductionRemoteHeads());

    expect(result).toEqual({ deleted: 0, reclaimedBytes: 0 });
    expect(await fileBytes(runtime)).toEqual(before);
  });

  test('a store without remote-heads records is left as is', async () => {
    const { adapter, runtime } = await setup();
    await seed(adapter, unrelated);

    const { deleted, reclaimedBytes, progress } = await deleteWithProgress(runtime);

    expect(deleted).toBe(0);
    expect(reclaimedBytes).toBe(0);
    expect(progress).toEqual([]);
    await expectIntact(adapter, unrelated);
  });
});
