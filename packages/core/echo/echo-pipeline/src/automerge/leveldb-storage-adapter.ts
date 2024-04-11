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
      .get<string, Uint8Array>(this._getDbKey(keyArray), { valueEncoding: 'buffer' })
      .catch((err) => (err.message === 'NotFound' ? undefined : Promise.reject(err)));
  }

  async save(keyArray: StorageKey, binary: Uint8Array): Promise<void> {
    await this._params.callbacks?.beforeSave?.(keyArray);
    await this._params.db.put<string, Uint8Array>(this._getDbKey(keyArray), Buffer.from(binary), {
      valueEncoding: 'buffer',
    });
    await this._params.callbacks?.afterSave?.(keyArray);
  }

  async remove(keyArray: StorageKey): Promise<void> {
    await this._params.db.del<string>(this._getDbKey(keyArray), {});
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    const result: Chunk[] = [];
    for await (const [key, value] of this._params.db.iterator<string, Uint8Array>({
      gte: this._getDbKey(keyPrefix),
      lte: this._getDbKey([...keyPrefix, '\uffff']),
      valueEncoding: 'buffer',
    })) {
      result.push({
        data: value,
        key: this._getStorageKey(key),
      });
    }

    return result;
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    const batch = this._params.db.batch();

    for await (const [key] of this._params.db.iterator<string, Uint8Array>({
      gte: this._getDbKey(keyPrefix),
      lte: this._getDbKey([...keyPrefix, '\uffff']),
      valueEncoding: 'buffer',
    })) {
      batch.del<string>(key, {});
    }
    await batch.write();
  }

  private _getDbKey(key: StorageKey): string {
    return key.map((k) => k.replaceAll('%', '%25').replaceAll('-', '%2D')).join('-');
  }

  private _getStorageKey(dbKey: string): StorageKey {
    return dbKey.split('-').map((k) => k.replaceAll('%2D', '-').replaceAll('%25', '%'));
  }
}
