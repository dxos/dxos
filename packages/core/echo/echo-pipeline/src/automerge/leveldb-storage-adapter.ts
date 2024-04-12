//
// Copyright 2024 DXOS.org
// s

import { type StorageAdapterInterface, type Chunk, type StorageKey } from '@dxos/automerge/automerge-repo';
import { type MaybePromise } from '@dxos/util';

import { type MySublevel } from './types';

export type LevelDBStorageAdapterParams = {
  db: MySublevel;
  callbacks?: StorageCallbacks;
};

export type StorageCallbacks = {
  beforeSave?: (path: StorageKey) => MaybePromise<void>;
  afterSave?: (path: StorageKey) => MaybePromise<void>;
};

export class LevelDBStorageAdapter implements StorageAdapterInterface {
  constructor(private readonly _params: LevelDBStorageAdapterParams) {}

  async load(keyArray: StorageKey): Promise<Uint8Array | undefined> {
    return this._params.db
      .get<StorageKey, Uint8Array>(keyArray, { keyEncoding: 'buffer', valueEncoding: 'buffer' })
      .catch((err) => (err.code === 'LEVEL_NOT_FOUND' ? undefined : Promise.reject(err)));
  }

  async save(keyArray: StorageKey, binary: Uint8Array): Promise<void> {
    await this._params.callbacks?.beforeSave?.(keyArray);
    await this._params.db.put<StorageKey, Uint8Array>(keyArray, Buffer.from(binary), {
      keyEncoding: 'buffer',
      valueEncoding: 'buffer',
    });
    await this._params.callbacks?.afterSave?.(keyArray);
  }

  async remove(keyArray: StorageKey): Promise<void> {
    await this._params.db.del<StorageKey>(keyArray, { keyEncoding: 'buffer' });
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    const result: Chunk[] = [];
    for await (const [key, value] of this._params.db.iterator<StorageKey, Uint8Array>({
      gte: keyPrefix,
      lte: [...keyPrefix, '\uffff'],
      keyEncoding: 'buffer',
      valueEncoding: 'buffer',
    })) {
      result.push({
        data: value,
        key,
      });
    }

    return result;
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    const batch = this._params.db.batch();

    for await (const [key] of this._params.db.iterator<StorageKey, Uint8Array>({
      gte: keyPrefix,
      lte: [...keyPrefix, '\uffff'],
      keyEncoding: 'buffer',
      valueEncoding: 'buffer',
    })) {
      batch.del<StorageKey>(key, { keyEncoding: 'buffer' });
    }
    await batch.write();
  }
}
