//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { join } from 'path';
import randomAccessIdb from 'random-access-idb';

import { File, StorageType } from '../interfaces';
import { FileInternal } from '../internal';
import { AbstractStorage } from './abstract-storage';

interface FileRegistryRecord {
  /**
   * Handle for open files with patched closed function which doesn't actually close the file.
   */
  file: File,
  /**
   * The actual file close funciton that is supposed to be called at the end of the storage lifecycle.
   */
  close: () => Promise<void>;
}

export class IDbStorage extends AbstractStorage {
  public override type: StorageType = StorageType.IDB;
  private _fileStorage: RandomAccessStorage;
  private _fileRegistry: Map<string, FileRegistryRecord> = new Map();

  constructor (protected rootPath: string) {
    super(rootPath);
    this._fileStorage = this._createFileStorage();
  }

  subDir (path: string) {
    return new IDbStorage(join(this.rootPath, path));
  }

  protected override _create (filename: string): File {
    // Looking up the file in the registry.
    if (this._fileRegistry.has(filename)) {
      const record = this._fileRegistry.get(filename);
      assert(record, 'File registry is corrupt');
      return record.file;
    }
    const file = new File(this._fileStorage(filename));

    // Monkeypatch close function.
    const defaultClose = file.close.bind(file) as any;
    // Do not close the file - put it in the registry and reuse later.
    // Caching file is necessary because in some cases IndexedDB dosen't handle reopening files well - so instead of reopening we can get already opened handle from the registry.
    file.close = (cb: any) => cb?.(null);

    this._fileRegistry.set(filename, { file, close: defaultClose });

    return file;
  }

  protected override async _destroy () {
    // Closing all files in the registry.
    await Promise.all(Array.from(this._fileRegistry.values()).map(({ close }) => close()));

    // eslint-disable-next-line no-undef
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this._root);
      request.onupgradeneeded = () => {
        resolve(); // TODO(unknown): Or reject?
      };
      request.onblocked = () => {
        resolve(); // TODO(unknown): Or reject?
      };
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(new Error('Couldn\'t clear indexedDB'));
      };
    });
  }

  protected _createFileStorage () {
    return randomAccessIdb(this._root);
  }
}

interface RandomAccessStorage {
  (file: string, opts?: {}): FileInternal;

  root: string;

  type: string;

  destroy(): Promise<void>;
}
