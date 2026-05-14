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
  /**
   * In-flight `loadRange` / `removeRange` iterations. Awaited in `_close` so
   * the adapter doesn't return from close while a `for await` on the sublevel
   * is still pending — otherwise the kv owner upstream would close the
   * sublevel and the iterator's next `.next()` would reject with
   * `LEVEL_ITERATOR_NOT_OPEN`.
   *
   * Promises stored here resolve regardless of outcome (the wrapper
   * `.catch`es) so `Promise.all` won't reject.
   */
  readonly #inFlightIterations = new Set<Promise<unknown>>();

  constructor(private readonly _params: LevelDBStorageAdapterProps) {
    super();
  }

  protected override async _close(): Promise<void> {
    // New `loadRange`/`removeRange` calls already short-circuit on `!isOpen`
    // (the Resource base flips state before invoking `_close`). Wait for any
    // iterations that started while we were still open to finish before
    // returning, so the upstream `kv` owner can safely close the sublevel.
    if (this.#inFlightIterations.size > 0) {
      await Promise.all(this.#inFlightIterations);
    }
  }

  #trackIteration<T>(work: Promise<T>): Promise<T> {
    const settled = work.catch(() => undefined);
    this.#inFlightIterations.add(settled);
    void settled.finally(() => this.#inFlightIterations.delete(settled));
    return work;
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

  /**
   * Atomically persist multiple key/value entries in a single LevelDB batch write.
   */
  async saveBatch(entries: Array<[StorageKey, Uint8Array]>): Promise<void> {
    if (!this.isOpen || entries.length === 0) {
      return undefined;
    }
    const startMs = Date.now();
    const batch = this._params.db.batch();

    for (const [keyArray] of entries) {
      await this._params.callbacks?.beforeSave?.({ path: keyArray, batch });
    }
    for (const [keyArray, binary] of entries) {
      batch.put<StorageKey, Uint8Array>(keyArray, Buffer.from(binary), {
        ...encodingOptions,
      });
    }
    await batch.write();

    let bytesStored = 0;
    for (const [keyArray, binary] of entries) {
      bytesStored += binary.byteLength;
      await this._params.callbacks?.afterSave?.(keyArray);
    }
    this._params.monitor?.recordBytesStored(bytesStored);
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
    return this.#trackIteration(this.#doLoadRange(keyPrefix));
  }

  async #doLoadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
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
    await this.#trackIteration(this.#doRemoveRange(keyPrefix));
  }

  async #doRemoveRange(keyPrefix: StorageKey): Promise<void> {
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
