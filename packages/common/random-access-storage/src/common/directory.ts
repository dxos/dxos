//
// Copyright 2022 DXOS.org
//

import { File } from './file';
import { getFullPath } from './utils';

/**
 * Wraps a directory in the storage file system.
 */
export class Directory {
  constructor (
    public readonly path: string,
    private readonly _getFilesInPath: () => File[],
    private readonly _createFile: (filename: string, path: string, opts?: any) => File,
    private readonly _deleteFilesInPath: () => Promise<void>
  ) {}

  getFiles (): File[] {
    return this._getFilesInPath();
  }

  createOrOpenFile (filename: string, opts?: any): File {
    return this._createFile(filename, this.path, opts);
  }

  createDirectory (path: string): Directory {
    return new Directory(
      getFullPath(this.path, path),
      this._getFilesInPath,
      this._createFile,
      this._deleteFilesInPath
    );
  }

  /**
   * Close and delete all files in the directory and all its subdirectories.
   */
  async delete () {
    await this._deleteFilesInPath();
  }
}
