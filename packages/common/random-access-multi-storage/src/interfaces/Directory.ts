//
// Copyright 2022 DXOS.org
//
import { getFullPath } from '../utils';
import { File } from './File';

export class Directory {

  constructor (private readonly _path: string,
    private readonly _createFile: (filename: string, path: string, opts?: any) => File,
    private readonly _destroyDirectory: (path: string) => Promise<void[]>
  ) { }

  createOrOpen (filename: string, opts?: any): File {
    const file = this._createFile(filename, this._path, opts);
    return file;
  }

  subDirectory (path: string): Directory {
    return new Directory(getFullPath(this._path, path), this._createFile, this._destroyDirectory);
  }

  async destroy () {
    return this._destroyDirectory(this._path);
  }
}
