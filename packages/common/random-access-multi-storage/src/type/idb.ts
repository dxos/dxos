//
// Copyright 2021 DXOS.org
//

import randomAccessIdb from 'random-access-idb';

import { RandomAccessAbstract } from '../random-access-abstract';
import { Storage } from '../types';

/**
 * IndexedDB implementation.
 * To inspect storage: Dev tools > Application > IndexedDB.
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
export class IDB extends RandomAccessAbstract {
  private _fileStorage: Storage | null;

  constructor (root: string) {
    super(root);

    this._fileStorage = null;
  }

  protected override _create (filename: string, opts: any = {}) {
    if (this._files.size === 0) {
      this._fileStorage = this._createFileStorage();
    }

    if (!this._fileStorage) {
      throw new Error('Set file storage first');
    }

    const file = this._fileStorage(filename, opts);

    // Monkeypatch close function.
    const defaultClose = file.close.bind(file);
    file.close = (cb) => {
      this._files.delete(file);
      if (this._files.size === 0) {
        return defaultClose(cb);
      }

      if (cb) {
        cb(null);
      }
    };

    return file;
  }

  protected override async _destroy () {
    // eslint-disable-next-line no-undef
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this._root);
      request.onupgradeneeded = () => {
        resolve(); // TODO: or reject?
      };
      request.onblocked = () => {
        resolve(); // TODO: or reject?
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
