//
// Copyright 2024 DXOS.org
// s

import { type MixedEncoding } from 'level-transcoder';

import { type StorageAdapterInterface, type Chunk, type StorageKey } from '@dxos/automerge/automerge-repo';
import { LifecycleState, Resource } from '@dxos/context';
import { type BatchLevel, type SubLevelDB } from '@dxos/kv-store';
import { type MaybePromise } from '@dxos/util';

export type LevelDBStorageAdapterParams = {
  db: SubLevelDB;
  callbacks?: StorageCallbacks;
};

export type BeforeSaveParams = { path: StorageKey; batch: BatchLevel };

export interface StorageCallbacks {
  beforeSave(params: BeforeSaveParams): MaybePromise<void>;
  afterSave(path: StorageKey): MaybePromise<void>;
}

export class LevelDBStorageAdapter extends Resource implements StorageAdapterInterface {
  constructor(private readonly _params: LevelDBStorageAdapterParams) {
    super();
  }

  async load(keyArray: StorageKey): Promise<Uint8Array | undefined> {
    try {
      if (this._lifecycleState !== LifecycleState.OPEN) {
        // TODO(mykola): this should be an error.
        return undefined;
      }
      return await this._params.db.get<StorageKey, Uint8Array>(keyArray, { ...encodingOptions });
    } catch (err: any) {
      if (isLevelDbNotFoundError(err)) {
        return undefined;
      }
      throw err;
    }
  }

  async save(keyArray: StorageKey, binary: Uint8Array): Promise<void> {
    if (this._lifecycleState !== LifecycleState.OPEN) {
      return undefined;
    }
    const batch = this._params.db.batch();

    await this._params.callbacks?.beforeSave?.({ path: keyArray, batch });
    batch.put<StorageKey, Uint8Array>(keyArray, Buffer.from(binary), {
      ...encodingOptions,
    });
    await batch.write();

    await this._params.callbacks?.afterSave?.(keyArray);
  }

  async remove(keyArray: StorageKey): Promise<void> {
    if (this._lifecycleState !== LifecycleState.OPEN) {
      return undefined;
    }
    await this._params.db.del<StorageKey>(keyArray, { ...encodingOptions });
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    if (this._lifecycleState !== LifecycleState.OPEN) {
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
    if (this._lifecycleState !== LifecycleState.OPEN) {
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
}

const keyEncoder: MixedEncoding<StorageKey, Uint8Array, StorageKey> = {
  encode: (key: StorageKey): Uint8Array =>
    Buffer.from(key.map((k) => k.replaceAll('%', '%25').replaceAll('-', '%2D')).join('-')),
  decode: (key: Uint8Array): StorageKey =>
    Buffer.from(key)
      .toString()
      .split('-')
      .map((k) => k.replaceAll('%2D', '-').replaceAll('%25', '%')),
  format: 'buffer',
};

export const encodingOptions = {
  keyEncoding: keyEncoder,
  valueEncoding: 'buffer',
};

const isLevelDbNotFoundError = (err: any): boolean => err.code === 'LEVEL_NOT_FOUND';
