//
// Copyright 2021 DXOS.org
//

import randomAccessIdb from 'random-access-idb';

import { StorageType } from '../interfaces';
import { RandomAccessStorage } from '../types';
import { getFullPath } from '../utils';
import { AbstractStorage } from './abstract-storage';
import { IDbDirectory } from './idb-directory';

export class IDbStorage extends AbstractStorage {
  public override type: StorageType = StorageType.IDB;
  readonly fileStorage: RandomAccessStorage;

  constructor (path: string) {
    super(path);
    this.fileStorage = this._createFileStorage();
  }

  directory (path = '') {
    return new IDbDirectory(getFullPath(this._path, path), this);
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
