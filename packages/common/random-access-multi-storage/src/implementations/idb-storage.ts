//
// Copyright 2021 DXOS.org
//

import { join } from 'path';
import randomAccessIdb from 'random-access-idb';

import { Directory, StorageType, File } from '../interfaces';
import { RandomAccessStorage } from '../types';
import { getFullPath } from '../utils';
import { AbstractStorage } from './abstract-storage';

export class IDbStorage extends AbstractStorage {
  public override type: StorageType = StorageType.IDB;
  private readonly _fileStorage: RandomAccessStorage;

  constructor (path: string) {
    super(path);
    this._fileStorage = this._createFileStorage();
  }

  directory (path = ''): Directory {
    return new Directory(getFullPath(this._path, path), (filename: string, path: string) => {
      const fullPath = join(path, filename);
      const existingFile = this._getFileIfExists(fullPath);
      if (existingFile) {
        existingFile._reopen();
        return existingFile;
      }
      const file = new File(this._fileStorage(fullPath));
      this._addFile(fullPath, file);
      return file;
    });
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
