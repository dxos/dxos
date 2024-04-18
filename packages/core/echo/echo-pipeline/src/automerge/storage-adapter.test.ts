//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { type StorageAdapterInterface } from '@dxos/automerge/automerge-repo';
import { PublicKey } from '@dxos/keys';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { type MaybePromise } from '@dxos/util';
import { TaskContext, describe, test } from 'vitest';

import { createTestLevel } from '../testing';
import { AutomergeStorageAdapter } from './automerge-storage-adapter';
import { LevelDBStorageAdapter } from './leveldb-storage-adapter';

const runTests = (
  testNamespace: string,
  /** Run per test. Expects automatic clean-up with `afterTest`. */ createAdapter: (
    task: TaskContext,
  ) => MaybePromise<StorageAdapterInterface>,
) => {
  describe(testNamespace, () => {
    const chunks = [
      { key: ['a', 'b', 'c', '1'], data: PublicKey.random().asUint8Array() },
      { key: ['a', 'b', 'c', '2'], data: PublicKey.random().asUint8Array() },
      { key: ['a', 'b', 'd', '3'], data: PublicKey.random().asUint8Array() },
      { key: ['a', 'b', 'd', '4'], data: PublicKey.random().asUint8Array() },
    ];

    test('should store and retrieve data', async (task) => {
      const adapter = await createAdapter(task);

      await adapter.save(chunks[0].key, chunks[0].data);
      expect(await adapter.load(chunks[0].key)).to.deep.equal(chunks[0].data);
    });

    test('loadRange return inputs with correct prefixes', async (task) => {
      const adapter = await createAdapter(task);

      for (const chunk of chunks) {
        await adapter.save(chunk.key, chunk.data);
      }

      expect((await adapter.loadRange(['a', 'b'])).length).to.equal(4);
      expect((await adapter.loadRange(['a', 'b', 'c']))[0]).to.deep.equal(chunks[0]);
      expect((await adapter.loadRange(['a', 'b', 'c'])).length).to.equal(2);
    });

    test('deletion works', async (task) => {
      const adapter = await createAdapter(task);

      for (const chunk of chunks) {
        await adapter.save(chunk.key, chunk.data);
      }

      await adapter.remove(['a', 'b', 'c', '1']);

      expect((await adapter.loadRange(['a', 'b'])).length).to.equal(3);
      expect((await adapter.loadRange(['a', 'b', 'c'])).length).to.equal(1);

      await adapter.removeRange(['a', 'b', 'd']);

      expect((await adapter.loadRange(['a', 'b'])).length).to.equal(1);
      expect((await adapter.loadRange(['a', 'b']))[0]).to.deep.equal(chunks[1]);
      expect(await adapter.load(['a', 'b', 'c', '2'])).to.deep.equal(chunks[1].data);
      expect(await adapter.load(['a', 'b', 'd', '3'])).to.be.undefined;
    });
  });
};

/**
 * Run tests for AutomergeStorageAdapter.
 */
runTests('AutomergeStorageAdapter', ({ onTestFinished }) => {
  const storage = createStorage({ type: StorageType.RAM });
  onTestFinished(() => storage.close());
  const dir = storage.createDirectory('automerge');
  const adapter = new AutomergeStorageAdapter(dir);
  onTestFinished(() => adapter.close());
  return adapter;
});

/**
 * Run tests for LevelDBStorageAdapter.
 */
runTests('LevelDBStorageAdapter', async ({ onTestFinished }) => {
  const level = createTestLevel();
  const adapter = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
  await level.open();
  await onTestFinished(() => level.close());
  await adapter.open();
  await onTestFinished(async () => {
    await adapter.close();
  });
  return adapter;
});
