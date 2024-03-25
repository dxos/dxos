//
// Copyright 2021 DXOS.org
//

import type { RandomAccessStorage } from 'random-access-storage';

import { AbstractStorage, getFullPath } from '../common';

/**
 * Base class for random access files based on IDB.
 */
export abstract class BrowserStorage extends AbstractStorage {
  protected readonly _fileStorage: (filename: string, opts?: {}) => RandomAccessStorage;

  constructor(path: string) {
    super(path);
    this._fileStorage = this._createFileStorage(path);
  }

  protected _createFile(path: string, filename: string): RandomAccessStorage {
    const fullPath = getFullPath(path, filename);
    return this._fileStorage(fullPath);
  }

  protected abstract _createFileStorage(path: string): (filename: string, opts?: {}) => RandomAccessStorage;

  protected override async _destroy() {
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
