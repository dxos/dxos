//
// Copyright 2022 DXOS.org
//

import { File } from './file';
import { StorageType } from './storage';
import { getFullPath } from './utils';

/**
 * Wraps a directory in the storage file system.
 */
export class Directory {
  constructor (
    public readonly type: StorageType,
    public readonly path: string,
    // TODO(burdon): Create interface for these methods (shared with AbstractStorage).
    private readonly _getFiles: () => File[],
    private readonly _getOrCreateFile: (path: string, filename: string, opts?: any) => File,
    private readonly _delete: () => Promise<void>
  ) {}

  toString () {
    return `Directory(${JSON.stringify({ type: this.type, path: this.path })})`;
  }

  /**
   * Create a new sub-directory.
   */
  createDirectory (path: string): Directory {
    return new Directory(
      this.type,
      getFullPath(this.path, path),
      this._getFiles,
      this._getOrCreateFile,
      this._delete
    );
  }

  /**
   * Get all files in the current directory.
   */
  getFiles (): File[] {
    return this._getFiles();
  }

  /**
   * Get or create a new file.
   */
  getOrCreateFile (filename: string, opts?: any): File {
    return this._getOrCreateFile(this.path, filename, opts);
  }

  /**
   * Close and delete all files in the directory and all its sub-directories.
   */
  async delete () {
    await this._delete();
  }
}
