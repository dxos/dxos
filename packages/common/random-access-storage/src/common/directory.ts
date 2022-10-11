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
    // TODO(burdon): Create interface for these methods.
    private readonly _getFilesInPath: () => File[],
    private readonly _getOrCreateFile: (path: string, filename: string, opts?: any) => Promise<File>,
    private readonly _deleteFilesInPath: () => Promise<void>
  ) {}

  /**
   * Create a new sub-directory.
   */
  createDirectory (path: string): Directory {
    return new Directory(
      getFullPath(this.path, path),
      this._getFilesInPath,
      this._getOrCreateFile,
      this._deleteFilesInPath
    );
  }

  /**
   * Get all files in the current directory.
   */
  getFiles (): File[] {
    return this._getFilesInPath();
  }

  /**
   * Get or create a new file.
   */
  async getOrCreateFile (filename: string, opts?: any): Promise<File> {
    return this._getOrCreateFile(this.path, filename, opts);
  }

  /**
   * Close and delete all files in the directory and all its sub-directories.
   */
  async delete () {
    await this._deleteFilesInPath();
  }
}
