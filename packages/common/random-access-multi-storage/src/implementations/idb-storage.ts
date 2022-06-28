//
// Copyright 2021 DXOS.org
//

import { join } from 'path';
import randomAccessIdb from 'random-access-idb';

import { File, StorageType } from '../interfaces';
import { FileInternal } from '../internal';
import { AbstractStorage } from './abstract-storage';

export class IDbStorage extends AbstractStorage {
  public override type: StorageType = StorageType.IDB;
  private _fileStorage: RandomAccessStorage;
  private _fileRegistry: Map<string, File> = new Map<string, File>();

  constructor (protected rootPath: string) {
    super(rootPath);
    this._fileStorage = this._createFileStorage();
  }

  subDir (path: string) {
    return new IDbStorage(join(this.rootPath, path));
  }

  override createOrOpen (filename: string): File {
    const existingFile = this._getFileIfOpened(filename);
    if (existingFile) {
      return existingFile;
    }
    const file = this._create(filename);
    this._files.set(filename, file);
    return file;
  }

  protected _getFileIfOpened (filename: string) {
    if (this._files.has(filename)) {
      const file = this._files.get(filename);
      if (file && !file._isDestroyed()) {
        file._reopen();
        return file;
      }
    }
    return null;
  }

  protected override _create (filename: string): File {
    return new File(this._fileStorage(filename));
  }

  protected override async _destroy () {
    // Closing all files in the registry.

    // eslint-disable-next-line no-undef
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this._root);
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
    return randomAccessIdb(this._root);
  }
}

interface RandomAccessStorage {
  (file: string, opts?: {}): FileInternal;

  root: string;

  type: string;

  destroy(): Promise<void>;
}
