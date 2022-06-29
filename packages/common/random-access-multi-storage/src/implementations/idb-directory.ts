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
    const fullPath = join(this._path, filename);
    const existingFile = this._storage._getFileIfExists(fullPath);
    if (existingFile) {
      existingFile._reopen();
      return existingFile;
    }
    const file = this._create(filename);
    this._storage._addFile(filename, file);
    return file;
  }

  protected override _create (filename: string): File {
    return new File(this._fileStorage(join(this._path, filename)));
  }

}
