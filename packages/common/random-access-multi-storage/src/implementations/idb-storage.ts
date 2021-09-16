//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import pify from 'pify';
import randomAccessIdb from 'random-access-idb';

import { IFile } from '..';
import { StorageType, STORAGE_IDB } from '../interfaces/storage-types';
import { AbstractStorage } from './abstract-storage';

interface FileRegistryRecord {
  file: IFile,
  close: () => Promise<void>;
}

export class IDbStorage extends AbstractStorage {
  public override type: StorageType = STORAGE_IDB;
  private _fileStorage: RandomAccessStorage;
  private _fileRegistry: Map<string, FileRegistryRecord> = new Map();

  constructor (protected rootPath: string) {
    super(rootPath);
    this._fileStorage = this._createFileStorage();
  }

  subDir (path: string) {
    return new IDbStorage(`${this.rootPath}${path}`);
  }

  protected override _create (filename: string) {
    if (this._fileRegistry.has(filename)) {
      const record = this._fileRegistry.get(filename);
      assert(record, 'File registry is corrupt');
      return record.file;
    }
    const file = this._fileStorage(filename);

    // Monkeypatch close function.
    const defaultClose = pify(file.close.bind(file));
    file.close = (cb: any) => {
      if (cb) {
        cb(null);
      }
    };

    this._fileRegistry.set(filename, { file, close: defaultClose });

    return file;
  }

  protected override async _destroy () {
    await Promise.all(Array.from(this._fileRegistry.values()).map(({ close }) => close()));

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

interface RandomAccessStorage {
  (file: string, opts?: {}): IFile;

  root: string;

  type: string;

  destroy(): Promise<void>;
}
