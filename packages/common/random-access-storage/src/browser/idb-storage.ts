//
// Copyright 2021 DXOS.org
//

import idb from 'random-access-idb';
import { RandomAccessStorage } from 'random-access-storage';

import {
  AbstractStorage,
  File,
  FileWrap,
  getFullPath,
  StorageType
} from '../common';

/**
 * Storage interface implementation for index DB.
 * https://github.com/random-access-storage/random-access-idb
 */
export class IDbStorage extends AbstractStorage {
  public override type: StorageType = StorageType.IDB;
  private readonly _fileStorage: (filename: string, opts?: {}) => RandomAccessStorage;

  constructor (path: string) {
    super(path);
    this._fileStorage = this._createFileStorage(path);
  }

  protected _createFileStorage (path: string): (filename: string, opts?: {}) => RandomAccessStorage {
    return idb(path);
  }

  protected override _createFile (path: string, filename: string): File {
    const fullPath = getFullPath(path, filename);
    return new FileWrap(this._fileStorage(fullPath));
  }

  protected override _openFile (file: File): File {
    (file.native as any).closed = false;
    return file;
  }

  protected override async _destroy () {
    // eslint-disable-next-line no-undef
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.path);
      request.onsuccess = () => {
        resolve();
      };
      request.onupgradeneeded = () => {
        reject(new Error('Upgrade needed.'));
      };
      request.onblocked = () => {
        reject(new Error('Blocked.'));
      };
      request.onerror = (err: any) => {
        reject(err);
      };
    });
  }
}
