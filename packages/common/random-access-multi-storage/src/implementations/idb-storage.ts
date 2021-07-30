//
// Copyright 2021 DXOS.org
//

import { IStorage } from "../interfaces/IStorage";
import { AbstractStorage } from "./abstract-storage";
import { StorageType, STORAGE_IDB } from "./storage-types";
import randomAccessIdb from 'random-access-idb';
import { RandomAccessStorage } from "../interfaces/random-access-storage";

export class IDbStorage extends AbstractStorage {
  public override type: StorageType = STORAGE_IDB;
  private _fileStorage: RandomAccessStorage;

  constructor (protected rootPath: string) {
    super(rootPath);
    this._fileStorage = this._createFileStorage()
  }

  subDir(path: string) {
    return new IDbStorage(`${this.rootPath}${path}`)
  }

  protected override _create (filename: string) {
    const file = this._fileStorage(filename);

    // Monkeypatch close function.
    const defaultClose = file.close.bind(file);
    file.close = (cb: any) => {
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
