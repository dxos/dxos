//
// Copyright 2024 DXOS.org
//

import { type StorageKey, type Chunk, type StorageAdapterInterface } from '@dxos/automerge/automerge-repo';
import { type MaybePromise } from '@dxos/util';

import { AutomergeStorageAdapter } from './automerge-storage-adapter';

export type StorageCallbacks = {
  beforeSave?: (path: string[]) => MaybePromise<void>;
  afterSave?: (path: string[]) => MaybePromise<void>;
};

export type AutomergeStorageWrapperParams = {
  storage: StorageAdapterInterface;
  callbacks: StorageCallbacks;
};

/**
 * Wrapper for automerge storage that adds callback on save.
 */
export class AutomergeStorageWrapper implements StorageAdapterInterface {
  private readonly _storage: StorageAdapterInterface;
  private readonly _callbacks: StorageCallbacks;

  constructor({ storage, callbacks }: AutomergeStorageWrapperParams) {
    this._storage = storage;
    this._callbacks = callbacks;
  }

  async load(key: StorageKey): Promise<Uint8Array | undefined> {
    return this._storage.load(key);
  }

  async save(key: StorageKey, value: Uint8Array): Promise<void> {
    await this._callbacks.beforeSave?.(key);
    await this._storage.save(key, value);
    await this._callbacks.afterSave?.(key);
  }

  async remove(key: StorageKey): Promise<void> {
    return this._storage.remove(key);
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    return this._storage.loadRange(keyPrefix);
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    return this._storage.removeRange(keyPrefix);
  }

  async close() {
    if (this._storage instanceof AutomergeStorageAdapter) {
      return this._storage.close();
    }
  }
}
