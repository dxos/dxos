//
// Copyright 2024 DXOS.org
//
//
// Copyright 2023 DXOS.org
//

import { type Chunk, type StorageKey, type StorageAdapterInterface } from '@dxos/automerge/automerge-repo';
import { type Directory } from '@dxos/random-access-storage';
import { arrayToBuffer, bufferToArray } from '@dxos/util';

export class AutomergeStorageAdapter implements StorageAdapterInterface {
  // TODO(mykola): Hack for restricting automerge Repo to access storage if Host is `closed`.
  //               Automerge Repo do not have any lifetime management.
  private _state: 'opened' | 'closed' = 'opened';

  constructor(private readonly _directory: Directory) {}

  async load(key: StorageKey): Promise<Uint8Array | undefined> {
    if (this._state !== 'opened') {
      return undefined;
    }
    const filename = this._getFilename(key);
    const file = this._directory.getOrCreateFile(filename);
    const { size } = await file.stat();
    if (!size || size === 0) {
      return undefined;
    }
    const buffer = await file.read(0, size);
    return bufferToArray(buffer);
  }

  async save(key: StorageKey, data: Uint8Array): Promise<void> {
    if (this._state !== 'opened') {
      return undefined;
    }
    const filename = this._getFilename(key);
    const file = this._directory.getOrCreateFile(filename);
    await file.write(0, arrayToBuffer(data));
    await file.truncate?.(data.length);

    await file.flush?.();
  }

  async remove(key: StorageKey): Promise<void> {
    if (this._state !== 'opened') {
      return undefined;
    }
    // TODO(dmaretskyi): Better deletion.
    const filename = this._getFilename(key);
    const file = this._directory.getOrCreateFile(filename);
    await file.destroy();
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    if (this._state !== 'opened') {
      return [];
    }
    const filename = this._getFilename(keyPrefix);
    const entries = await this._directory.list();
    return Promise.all(
      entries
        .filter((entry) => entry.startsWith(filename))
        .map(async (entry): Promise<Chunk> => {
          const file = this._directory.getOrCreateFile(entry);
          const { size } = await file.stat();
          const buffer = await file.read(0, size);
          return {
            key: this._getKeyFromFilename(entry),
            data: bufferToArray(buffer),
          };
        }),
    );
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    if (this._state !== 'opened') {
      return undefined;
    }
    const filename = this._getFilename(keyPrefix);
    const entries = await this._directory.list();
    await Promise.all(
      entries
        .filter((entry) => entry.startsWith(filename))
        .map(async (entry): Promise<void> => {
          const file = this._directory.getOrCreateFile(entry);
          await file.destroy();
        }),
    );
  }

  async close(): Promise<void> {
    this._state = 'closed';
  }

  private _getFilename(key: StorageKey): string {
    return key.map((k) => k.replaceAll('%', '%25').replaceAll('-', '%2D')).join('-');
  }

  private _getKeyFromFilename(filename: string): StorageKey {
    return filename.split('-').map((k) => k.replaceAll('%2D', '-').replaceAll('%25', '%'));
  }
}
