//
// Copyright 2024 DXOS.org
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

import { type ReplicantEnv, ReplicantRegistry } from '../plan';

export type AdaptorKind = 'idb' | 'opfs' | 'node' | 'leveldb';

export type RunResults = {
  saveDuration: number;
  loadDuration: number;
  sanityDuration: number;
};

export class StorageReplicant {
  private _storageCtx = new Context();

  constructor(private readonly env: ReplicantEnv) {}

  // TODO(mykola): Refactor to smaller methods.
  async run({
    batchSize,
    filesAmount,
    fileSize,
    storageAdaptor,
  }: {
    batchSize: number;
    filesAmount: number;
    fileSize: number;
    storageAdaptor: AdaptorKind;
  }): Promise<RunResults> {
    const results = {} as RunResults;
    const batches = Array.from({ length: Math.ceil(filesAmount / batchSize) }).map((_, idx) =>
      PublicKey.random().toHex(),
    );

    const filesToSave = range(filesAmount).map((idx) => {
      const batch = batches[Math.floor(idx / batchSize)];
      const key = ['file', batch, idx.toString()];
      const data = Buffer.from(range(fileSize).map(() => Math.floor(Math.random() * 256)));
      return { key, data, batch };
    });

    {
      // Save.
      performance.mark('save:begin');
      const storageAdapter = await this._createStorage(storageAdaptor);
      for (const batch of batches) {
        await Promise.all(
          filesToSave.filter((file) => file.batch === batch).map((file) => storageAdapter.save(file.key, file.data)),
        );
      }
      performance.mark('save:end');
      results.saveDuration = performance.measure('save', 'save:begin', 'save:end').duration;
      log.info('docs saved', {
        count: filesToSave.length,
        time: results.saveDuration,
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
      const storageAdapter = await this._createStorage(storageAdaptor);
      for (const batch of batches) {
        const loadedBatch = await storageAdapter.loadRange(['file', batch]);
        loadedFiles.push(...loadedBatch);
      }
      performance.mark('load:end');
      results.loadDuration = performance.measure('load', 'load:begin', 'load:end').duration;
      log.info('docs loaded', {
        count: loadedFiles.length,
        time: results.loadDuration,
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
      results.sanityDuration = performance.measure('sanity', 'sanity:begin', 'sanity:end').duration;
      log.info('sanity check', {
        count: loadedFiles.length,
        time: results.sanityDuration,
      });
    }
    return results;
  }

  private async _createStorage(kind: AdaptorKind) {
    switch (kind) {
      case 'idb':
        return new IndexedDBStorageAdapter();
      case 'opfs': {
        const storage = createStorage({ type: StorageType.WEBFS });
        this._storageCtx.onDispose(() => storage.close());
        return new AutomergeStorageAdapter(storage.createDirectory('automerge'));
      }
      case 'leveldb': {
        const level = await createLevel({ persistent: true, dataRoot: `/tmp/dxos/${this.env.params.testId}` });
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

ReplicantRegistry.instance.register(StorageReplicant);
