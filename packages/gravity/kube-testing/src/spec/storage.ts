//
// Copyright 2023 DXOS.org
//

import { IndexedDBStorageAdapter } from '@dxos/automerge/automerge-repo-storage-indexeddb';
import { Context } from '@dxos/context';
import { AutomergeStorageAdapter } from '@dxos/echo-pipeline';
import { log } from '@dxos/log';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { range } from '@dxos/util';

import {
  type AgentEnv,
  type AgentRunOptions,
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
  storageAdaptor: 'idb' | 'opfs' | 'node';

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
      storageAdaptor: 'idb',
      filesAmount: 1000,
      fileSize: 1000,
      batchSize: 0,
    };
  }

  async init({ spec }: TestParams<StorageTestSpec>): Promise<AgentRunOptions<StorageAgentConfig>[]> {
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

    const filesToSave = range(spec.fileSize).map((idx) => {
      const batchIdx = Math.floor(idx / batchSize);
      const key = ['file', batchIdx.toString(), idx.toString()];
      const data = new Uint8Array(range(spec.fileSize).map(() => Math.floor(Math.random() * 256)));
      return { key, data, batchIdx };
    });

    {
      performance.mark('save:begin');
      const storageAdapter = this._createStorage(spec.storageAdaptor);
      for (const batchIdx of range(Math.ceil(spec.filesAmount / batchSize))) {
        await Promise.all(
          filesToSave
            .filter((file) => file.batchIdx === batchIdx)
            .map((file) => storageAdapter.save(file.key, file.data)),
        );
      }
      performance.mark('save:end');
      log.info('docs saved', {
        count: filesToSave.length,
        time: performance.measure('save', 'save:begin', 'save:end').duration,
      });
    }

    await this._storageCtx.dispose();
    this._storageCtx = new Context();

    {
      performance.mark('load:begin');
      const loadedFiles = [];
      const storageAdapter = this._createStorage(spec.storageAdaptor);
      for (const batchIdx of range(Math.ceil(spec.filesAmount / batchSize))) {
        loadedFiles.push(await storageAdapter.loadRange(['file', batchIdx.toString()]));
      }
      performance.mark('load:end');
      log.info('docs ready', {
        count: loadedFiles.length,
        time: performance.measure('load', 'load:begin', 'load:end').duration,
      });
    }
  }

  async finish(params: TestParams<StorageTestSpec>, results: PlanResults): Promise<any> {}

  private _storageCtx = new Context();

  private _createStorage(kind: StorageTestSpec['storageAdaptor']) {
    switch (kind) {
      case 'idb':
        return new IndexedDBStorageAdapter();
      case 'opfs': {
        const storage = createStorage({ type: StorageType.WEBFS });
        this._storageCtx.onDispose(() => storage.close());
        return new AutomergeStorageAdapter(storage.createDirectory('automerge'));
      }
      default: {
        throw new Error(`Unsupported storage kind: ${kind}`);
      }
    }
  }
}
