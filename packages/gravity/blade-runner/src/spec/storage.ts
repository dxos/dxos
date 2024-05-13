//
// Copyright 2023 DXOS.org
//

import { IndexedDBStorageAdapter } from '@dxos/automerge/automerge-repo-storage-indexeddb';
import { createLevel } from '@dxos/client-services';
import { Context } from '@dxos/context';
import { AutomergeStorageAdapter, LevelDBStorageAdapter } from '@dxos/echo-pipeline';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { range } from '@dxos/util';

import {
  type AgentEnv,
  type ReplicantRunOptions,
  type PlanResults,
  type Platform,
  type TestParams,
  type TestPlan,
} from '../plan';

/**
 * Test specification for Storage benchmark.
 */

export type StorageTestSpec = {
  platform: Platform;
  storageAdaptor: 'idb' | 'opfs' | 'node' | 'leveldb';

  filesAmount: number;
  fileSize: number; // in bytes
  /**
   * Asynchronously save and load files in batches.
   */
  batchSize: number;
};

export type StorageAgentConfig = {};

export class StorageTestPlan implements TestPlan<StorageTestSpec, StorageAgentConfig> {
  defaultSpec(): StorageTestSpec {
    return {
      platform: 'chromium',
      storageAdaptor: 'leveldb',
      filesAmount: 10_000,
      fileSize: 1024,
      batchSize: 100,
    };
  }

  async init({ spec }: TestParams<StorageTestSpec>): Promise<ReplicantRunOptions<StorageAgentConfig>[]> {
    return [
      {
        config: {},
        runtime: { platform: spec.platform },
      },
    ];
  }

  async run(env: AgentEnv<StorageTestSpec, StorageAgentConfig>): Promise<void> {
    const { spec } = env.params;
    const batchSize = spec.batchSize <= 0 ? spec.filesAmount : spec.batchSize;
    const batches = Array.from({ length: Math.ceil(spec.filesAmount / batchSize) }).map((_, idx) =>
      PublicKey.random().toHex(),
    );

    const filesToSave = range(spec.filesAmount).map((idx) => {
      const batch = batches[Math.floor(idx / batchSize)];
      const key = ['file', batch, idx.toString()];
      const data = Buffer.from(range(spec.fileSize).map(() => Math.floor(Math.random() * 256)));
      return { key, data, batch };
    });

    {
      // Save.
      performance.mark('save:begin');
      const storageAdapter = await this._createStorage(spec.storageAdaptor);
      for (const batch of batches) {
        await Promise.all(
          filesToSave.filter((file) => file.batch === batch).map((file) => storageAdapter.save(file.key, file.data)),
        );
      }
      performance.mark('save:end');
      log.info('docs saved', {
        count: filesToSave.length,
        time: performance.measure('save', 'save:begin', 'save:end').duration,
      });
    }

    {
      // Dispose storage adaptor.
      await this._storageCtx.dispose();
      this._storageCtx = new Context();
    }

    const loadedFiles: { key: string[]; data: Uint8Array | undefined }[] = [];
    {
      // Load.
      performance.mark('load:begin');
      const storageAdapter = await this._createStorage(spec.storageAdaptor);
      for (const batch of batches) {
        const loadedBatch = await storageAdapter.loadRange(['file', batch]);
        loadedFiles.push(...loadedBatch);
      }
      performance.mark('load:end');
      log.info('docs loaded', {
        count: loadedFiles.length,
        time: performance.measure('load', 'load:begin', 'load:end').duration,
      });
    }

    {
      // Sanity check
      performance.mark('sanity:begin');
      for (const file of loadedFiles) {
        invariant(
          filesToSave.find((f) => f.key.join() === file.key.join())!.data.equals(Buffer.from(file.data!)),
          `sanity check failed ${file.key.join()}`,
        );
      }
      performance.mark('sanity:end');
      log.info('sanity check', {
        count: loadedFiles.length,
        time: performance.measure('sanity', 'sanity:begin', 'sanity:end').duration,
      });
    }
  }

  async finish(params: TestParams<StorageTestSpec>, results: PlanResults): Promise<any> {}

  private _storageCtx = new Context();
  private _testId = PublicKey.random().toHex();

  private async _createStorage(kind: StorageTestSpec['storageAdaptor']) {
    switch (kind) {
      case 'idb':
        return new IndexedDBStorageAdapter();
      case 'opfs': {
        const storage = createStorage({ type: StorageType.WEBFS });
        this._storageCtx.onDispose(() => storage.close());
        return new AutomergeStorageAdapter(storage.createDirectory('automerge'));
      }
      case 'leveldb': {
        const level = await createLevel({ persistent: true, dataRoot: `/tmp/dxos/${this._testId}` });
        this._storageCtx.onDispose(() => level.close());
        const adapter = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
        await adapter.open();
        this._storageCtx.onDispose(() => adapter.close());
        return adapter;
      }
      default: {
        throw new Error(`Unsupported storage kind: ${kind}`);
      }
    }
  }
}
