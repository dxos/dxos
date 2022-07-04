//
// Copyright 2022 DXOS.org
//
import { getFullPath } from '../utils';
import { File } from './File';

/**
 * The small class to remember the path of subdirectories in Storage.
 */
export class Directory {

  constructor (private readonly _path: string,
    private readonly _createFile: (filename: string, path: string, opts?: any) => File,
    private readonly _destroyFilesInPath: (path: string) => Promise<void[]>
  ) { }

  createOrOpen (filename: string, opts?: any): File {
    const file = this._createFile(filename, this._path, opts);
    return file;
  }

  subDirectory (path: string): Directory {
    return new Directory(getFullPath(this._path, path), this._createFile, this._destroyFilesInPath);
  }

  /**
   * Delete all files in the directory and all its subdirectories.
   */
  async destroy () {
    return this._destroyFilesInPath(this._path);
  }
}
