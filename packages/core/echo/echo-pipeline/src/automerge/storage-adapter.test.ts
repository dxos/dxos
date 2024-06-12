//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { type StorageAdapterInterface } from '@dxos/automerge/automerge-repo';
import { randomBytes } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { afterTest, describe, test } from '@dxos/test';
import { arrayToBuffer, bufferToArray, type MaybePromise } from '@dxos/util';

import { AutomergeStorageAdapter } from './automerge-storage-adapter';
import { LevelDBStorageAdapter } from './leveldb-storage-adapter';

const runTests = (
  testNamespace: string,
  /** Run per test. Expects automatic clean-up with `afterTest`. */
  createAdapter: (root?: string) => MaybePromise<{
    adapter: StorageAdapterInterface;
    /** Would be called automatically with `afterTest`. Exposed for mid-test clean-up. */
    close: () => MaybePromise<void>;
  }>,
) => {
  describe(testNamespace, () => {
    const chunks = [
      { key: ['a', 'b', 'c', '1'], data: PublicKey.random().asUint8Array() },
      { key: ['a', 'b', 'c', '2'], data: PublicKey.random().asUint8Array() },
      { key: ['a', 'b', 'd', '3'], data: PublicKey.random().asUint8Array() },
      { key: ['a', 'b', 'd', '4'], data: PublicKey.random().asUint8Array() },
    ];

    test('should store and retrieve data', async () => {
      const { adapter } = await createAdapter();

      await adapter.save(chunks[0].key, chunks[0].data);
      expect(await adapter.load(chunks[0].key)).to.deep.equal(chunks[0].data);
    });

    test('loadRange return inputs with correct prefixes', async () => {
      const { adapter } = await createAdapter();

      for (const chunk of chunks) {
        await adapter.save(chunk.key, chunk.data);
      }

      expect((await adapter.loadRange(['a', 'b'])).length).to.equal(4);
      expect((await adapter.loadRange(['a', 'b', 'c']))[0]).to.deep.equal(chunks[0]);
      expect((await adapter.loadRange(['a', 'b', 'c'])).length).to.equal(2);
    });

    test('deletion works', async () => {
      const { adapter } = await createAdapter();

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

    test('loadRange', async () => {
      const root = `/tmp/${randomBytes(16).toString('hex')}`;
      {
        const { adapter, close } = await createAdapter(root);
        await adapter.save(['test', '1'], bufferToArray(Buffer.from('one')));
        await adapter.save(['test', '2'], bufferToArray(Buffer.from('two')));
        await adapter.save(['bar', '1'], bufferToArray(Buffer.from('bar')));
        await close();
      }

      {
        const { adapter } = await createAdapter(root);
        const range = await adapter.loadRange(['test']);
        expect(range.map((chunk) => arrayToBuffer(chunk.data!).toString())).to.deep.eq(['one', 'two']);
        expect(range.map((chunk) => chunk.key)).to.deep.eq([
          ['test', '1'],
          ['test', '2'],
        ]);
      }
    });

    test('removeRange', async () => {
      const root = `/tmp/${randomBytes(16).toString('hex')}`;
      {
        const { adapter, close } = await createAdapter(root);
        await adapter.save(['test', '1'], bufferToArray(Buffer.from('one')));
        await adapter.save(['test', '2'], bufferToArray(Buffer.from('two')));
        await adapter.save(['bar', '1'], bufferToArray(Buffer.from('bar')));
        await close();
      }

      {
        const { adapter } = await createAdapter(root);
        await adapter.removeRange(['test']);
        const range = await adapter.loadRange(['test']);
        expect(range.map((chunk) => arrayToBuffer(chunk.data!).toString())).to.deep.eq([]);
        const range2 = await adapter.loadRange(['bar']);
        expect(range2.map((chunk) => arrayToBuffer(chunk.data!).toString())).to.deep.eq(['bar']);
        expect(range2.map((chunk) => chunk.key)).to.deep.eq([['bar', '1']]);
      }
    });
  });
};

/**
 * Run tests for AutomergeStorageAdapter.
 */
runTests('AutomergeStorageAdapter', (root?: string) => {
  const storage = createStorage({ type: root ? StorageType.NODE : StorageType.RAM, root });
  const dir = storage.createDirectory('automerge');
  const adapter = new AutomergeStorageAdapter(dir);

  const close = async () => {
    await adapter.close();
    await storage.close();
  };
  afterTest(close);

  return {
    adapter,
    close,
  };
});

/**
 * Run tests for LevelDBStorageAdapter.
 */
runTests('LevelDBStorageAdapter', async (root?: string) => {
  const level = createTestLevel(root);
  await level.open();
  const adapter = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
  await adapter.open?.();

  const close = async () => {
    await adapter.close();
    await level.close();
  };
  afterTest(close);
  return {
    adapter,
    close,
  };
});
