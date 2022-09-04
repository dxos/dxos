//
// Copyright 2021 DXOS.org
//

import { join } from 'node:path';
import randomAccessIdb from 'random-access-idb';

import { StorageType, File } from '../interfaces';
import { RandomAccessStorage } from '../types';
import { AbstractStorage } from './abstract-storage';

/**
 * Storage interface implementation for index DB.
 */
export class IDbStorage extends AbstractStorage {
  public override type: StorageType = StorageType.IDB;
  private readonly _fileStorage: RandomAccessStorage;

  constructor (path: string) {
    super(path);
    this._fileStorage = this._createFileStorage();
  }

  protected _createFile (filename: string, path: string): File {
    const fullPath = join(path, filename);
    const existingFile = this._getFileIfExists(fullPath);
    if (existingFile) {
      existingFile._reopen();
      return existingFile;
    }
    const file = new File(this._fileStorage(fullPath));
    this._addFile(fullPath, file);
    return file;
  }

  protected override async _destroy () {
    // eslint-disable-next-line no-undef
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this._path);
      request.onupgradeneeded = () => {
        reject(new Error('Couldn\'t clear indexedDB, because upgrade needed.'));
      };
      request.onblocked = () => {
        reject(new Error('Couldn\'t clear indexedDB, because it is blocked'));
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
    return randomAccessIdb(this._path);
  }
}
