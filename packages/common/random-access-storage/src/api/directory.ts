//
// Copyright 2022 DXOS.org
//

import { getFullPath } from '../utils';
import { File } from './file';

/**
 * Handle to a directory in the storage file system.
 */
export class Directory {
  constructor (
    public readonly path: string,
    private readonly _createFile: (filename: string, path: string, opts?: any) => File,
    private readonly _deleteFilesInPath: (path: string) => Promise<void>
  ) { }

  createOrOpenFile (filename: string, opts?: any): File {
    return this._createFile(filename, this.path, opts);
  }

  /**
   * Create sub-directory.
   */
  createDirectory (path: string): Directory {
    return new Directory(getFullPath(this.path, path), this._createFile, this._deleteFilesInPath);
  }

  /**
   * Delete all files in the directory and all its subdirectories.
   */
  async delete () {
    await this._deleteFilesInPath(this.path);
  }
}
