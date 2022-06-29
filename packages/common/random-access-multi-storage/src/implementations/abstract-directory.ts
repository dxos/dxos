//
// Copyright 2022 DXOS.org
//

import { File, Directory, Storage } from '../interfaces';
import { getFullPath } from '../utils';

export abstract class AbstractDirectory implements Directory {
  constructor (protected readonly _path: string, protected readonly _storage: Storage) {}

  subDirectory (path: string): Directory {
    const fullPath = getFullPath(this._path, path);
    return this._storage.directory(fullPath);
  }

  public createOrOpen (filename: string, opts?: any): File {
    const fullPath = getFullPath(this._path, filename);
    const file = this._create(filename, opts);
    this._storage._addFile(fullPath, file);
    return file;
  }

  protected abstract _create (filename: string, opts?: any): File;
}
