//
// Copyright 2022 DXOS.org
//

import { join } from 'path';

import { File } from '../interfaces';
import { RandomAccessStorage } from '../types';
import { AbstractDirectory } from './abstract-directory';
import { IDbStorage } from './idb-storage';

export class IDbDirectory extends AbstractDirectory {
  private readonly _fileStorage: RandomAccessStorage

  constructor (path: string, storage: IDbStorage) {
    super(path, storage);
    this._fileStorage = storage.fileStorage;
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
    return new File(this._fileStorage(join(this._path, filename)));
  }

}
