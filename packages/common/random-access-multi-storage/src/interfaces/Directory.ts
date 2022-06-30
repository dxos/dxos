//
// Copyright 2022 DXOS.org
//
import { getFullPath } from '../utils';
import { File } from './File';

export class Directory {

  constructor (protected readonly _path: string, protected readonly _createFile: (filename: string, path: string, opts?: any) => File) {}

  createOrOpen (filename: string, opts?: any): File {
    const file = this._createFile(filename, this._path, opts);
    return file;
  }

  subDirectory (path: string): Directory {
    return new Directory(getFullPath(this._path, path), this._createFile);
  }
}
