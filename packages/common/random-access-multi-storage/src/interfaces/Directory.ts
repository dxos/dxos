//
// Copyright 2022 DXOS.org
//
import { getFullPath } from '../utils';
import { File } from './File';

/**
 * Handle to a directory in the storage file system.
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
  async delete () {
    return this._destroyFilesInPath(this._path);
  }
}
