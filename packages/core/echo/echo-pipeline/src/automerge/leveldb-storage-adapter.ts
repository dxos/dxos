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
  private _state: 'opened' | 'closed' = 'opened';
  constructor(private readonly _params: LevelDBStorageAdapterParams) {}

  async load(keyArray: StorageKey): Promise<Uint8Array | undefined> {
    if (this._state !== 'opened') {
      return undefined;
    }
    return this._params.db
      .get<StorageKey, Uint8Array>(keyArray, { ...encodingOptions })
      .catch((err) => (err.code === 'LEVEL_NOT_FOUND' ? undefined : Promise.reject(err)));
  }

  async save(keyArray: StorageKey, binary: Uint8Array): Promise<void> {
    if (this._state !== 'opened') {
      return undefined;
    }
    await this._params.callbacks?.beforeSave?.(keyArray);
    await this._params.db.put<StorageKey, Uint8Array>(keyArray, Buffer.from(binary), {
      ...encodingOptions,
    });
    await this._params.callbacks?.afterSave?.(keyArray);
  }

  async remove(keyArray: StorageKey): Promise<void> {
    if (this._state !== 'opened') {
      return undefined;
    }
    await this._params.db.del<StorageKey>(keyArray, { ...encodingOptions });
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    if (this._state !== 'opened') {
      return [];
    }
    const result: Chunk[] = [];
    for await (const [key, value] of this._params.db.iterator<StorageKey, Uint8Array>({
      gte: keyPrefix,
      lte: [...keyPrefix, '\uffff'],
      ...encodingOptions,
    })) {
      result.push({
        key,
        data: value,
      });
    }
    return result;
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    if (this._state !== 'opened') {
      return undefined;
    }
    const batch = this._params.db.batch();

    for await (const [key] of this._params.db.iterator<StorageKey, Uint8Array>({
      gte: keyPrefix,
      lte: [...keyPrefix, '\uffff'],
      ...encodingOptions,
    })) {
      batch.del<StorageKey>(key, { ...encodingOptions });
    }
    await batch.write();
  }

  async close() {
    this._state = 'closed';
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

export const encodingOptions = {
  keyEncoding: keyEncoder,
  valueEncoding: 'buffer',
};
