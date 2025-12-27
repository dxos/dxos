//
// Copyright 2024 DXOS.org
// s

import { type Chunk, type StorageAdapterInterface, type StorageKey } from '@automerge/automerge-repo';
import { type MixedEncoding } from 'level-transcoder';

import { Resource } from '@dxos/context';
import { type BatchLevel, type SublevelDB } from '@dxos/kv-store';
import { type MaybePromise } from '@dxos/util';

export interface StorageAdapterDataMonitor {
  recordBytesStored(count: number): void;
  recordBytesLoaded(count: number): void;
  recordLoadDuration(durationMs: number): void;
  recordStoreDuration(durationMs: number): void;
}

export type LevelDBStorageAdapterProps = {
  db: SublevelDB;
  callbacks?: StorageCallbacks;
  monitor?: StorageAdapterDataMonitor;
};

export type BeforeSaveProps = { path: StorageKey; batch: BatchLevel };

export interface StorageCallbacks {
  beforeSave(params: BeforeSaveProps): MaybePromise<void>;
  afterSave(path: StorageKey): MaybePromise<void>;
}

export class LevelDBStorageAdapter extends Resource implements StorageAdapterInterface {
  constructor(private readonly _params: LevelDBStorageAdapterProps) {
    super();
  }

  async load(keyArray: StorageKey): Promise<Uint8Array | undefined> {
    try {
      if (!this.isOpen) {
        // TODO(mykola): this should be an error.
        return undefined;
      }
      const startMs = Date.now();
      const chunk = await this._params.db.get<StorageKey, Uint8Array>(keyArray, { ...encodingOptions });
      this._params.monitor?.recordBytesLoaded(chunk.byteLength);
      this._params.monitor?.recordLoadDuration(Date.now() - startMs);
      return chunk;
    } catch (err: any) {
      if (isLevelDbNotFoundError(err)) {
        return undefined;
      }
      throw err;
    }
  }

  async save(keyArray: StorageKey, binary: Uint8Array): Promise<void> {
    if (!this.isOpen) {
      return undefined;
    }
    const startMs = Date.now();
    const batch = this._params.db.batch();

    await this._params.callbacks?.beforeSave?.({ path: keyArray, batch });
    batch.put<StorageKey, Uint8Array>(keyArray, Buffer.from(binary), {
      ...encodingOptions,
    });
    await batch.write();
    this._params.monitor?.recordBytesStored(binary.byteLength);

    await this._params.callbacks?.afterSave?.(keyArray);
    this._params.monitor?.recordStoreDuration(Date.now() - startMs);
  }

  async remove(keyArray: StorageKey): Promise<void> {
    if (!this.isOpen) {
      return undefined;
    }
    await this._params.db.del<StorageKey>(keyArray, { ...encodingOptions });
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    if (!this.isOpen) {
      return [];
    }
    const startMs = Date.now();
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
      this._params.monitor?.recordBytesLoaded(value.byteLength);
    }
    this._params.monitor?.recordLoadDuration(Date.now() - startMs);
    return result;
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    if (!this.isOpen) {
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
