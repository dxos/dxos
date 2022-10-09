//
// Copyright 2021 DXOS.org
//

import { join } from 'node:path';

import { createFile, AbstractStorage, File } from '../common';
import type { RandomAccessFile } from '../types';

/**
 * Base class for random access files based on IDB.
 * https://www.npmjs.com/package/abstract-random-access
 */
export abstract class BrowserStorage extends AbstractStorage {
  private readonly _fileStorage: (filename: string, opts?: {}) => RandomAccessFile;

  constructor (path: string) {
    super(path);
    this._fileStorage = this._createFileStorage(path);
  }

  protected abstract _createFileStorage (path: string): (filename: string, opts?: {}) => RandomAccessFile;

  protected _createFile (filename: string, path: string): File {
    const fullPath = join(path, filename);
    const existingFile = this._getFileIfExists(fullPath);
    if (existingFile) {
      existingFile.reopen();
      return existingFile;
    }

    const file = createFile(this._fileStorage(fullPath));
    this._addFile(fullPath, file);
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
        reject(new Error('Blocked'));
      };
      request.onerror = (err: any) => {
        reject(err);
      };
    });
  }
}
