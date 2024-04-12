//
// Copyright 2024 DXOS.org
// s

import { type MixedEncoding } from 'level-transcoder';

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
      .get<StorageKey, Uint8Array>(keyArray, { keyEncoding: keyEncoder, valueEncoding: 'buffer' })
      .catch((err) => (err.code === 'LEVEL_NOT_FOUND' ? undefined : Promise.reject(err)));
  }

  async save(keyArray: StorageKey, binary: Uint8Array): Promise<void> {
    await this._params.callbacks?.beforeSave?.(keyArray);
    await this._params.db.put<StorageKey, Uint8Array>(keyArray, Buffer.from(binary), {
      keyEncoding: keyEncoder,
      valueEncoding: 'buffer',
    });
    await this._params.callbacks?.afterSave?.(keyArray);
  }

  async remove(keyArray: StorageKey): Promise<void> {
    await this._params.db.del<StorageKey>(keyArray, { keyEncoding: keyEncoder });
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    const result: Chunk[] = [];
    for await (const [key, value] of this._params.db.iterator<StorageKey, Uint8Array>({
      gte: keyPrefix,
      lte: [...keyPrefix, '\uffff'],
      keyEncoding: keyEncoder,
      valueEncoding: 'buffer',
    })) {
      result.push({
        key,
        data: value,
      });
    }
    return result;
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    const batch = this._params.db.batch();

    for await (const [key] of this._params.db.iterator<StorageKey, Uint8Array>({
      gte: keyPrefix,
      lte: [...keyPrefix, '\uffff'],
      keyEncoding: keyEncoder,
      valueEncoding: 'buffer',
    })) {
      batch.del<StorageKey>(key, { keyEncoding: keyEncoder });
    }
    await batch.write();
  }
}

const keyEncoder: MixedEncoding<StorageKey, Uint8Array, StorageKey> = {
  encode: (key: StorageKey): Uint8Array =>
    Buffer.from(key.map((k) => k.replaceAll('%', '%25').replaceAll('-', '%2D')).join('-')),
  decode: (key: Uint8Array): StorageKey =>
    Buffer.from(key)
      .toString()
      .split('-')
      .map((k) => k.replaceAll('%2D', '-').replaceAll('%25', '%')),
};
