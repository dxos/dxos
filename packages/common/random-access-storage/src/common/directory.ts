//
// Copyright 2022 DXOS.org
//

import { type File } from './file';
import { type StorageType } from './storage';
import { getFullPath } from './utils';

export type DirectoryProps = {
  type: StorageType;
  path: string;
  // TODO(burdon): Create interface for these methods (shared with AbstractStorage).
  list: (path: string) => Promise<string[]>;
  getOrCreateFile: (path: string, filename: string, opts?: any) => File;
  remove: () => Promise<void>;
  onFlush?: () => Promise<void>;
};

/**
 * Wraps a directory in the storage file system.
 */
export class Directory {
  public readonly type: StorageType;
  public readonly path: string;
  // TODO(burdon): Create interface for these methods (shared with AbstractStorage).
  private readonly _list: (path: string) => Promise<string[]>;
  private readonly _getOrCreateFile: (path: string, filename: string, opts?: any) => File;
  private readonly _remove: () => Promise<void>;
  private readonly _onFlush?: () => Promise<void>;

  constructor({ type, path, list, getOrCreateFile, remove, onFlush }: DirectoryProps) {
    this.type = type;
    this.path = path;
    this._list = list;
    this._getOrCreateFile = getOrCreateFile;
    this._remove = remove;
    this._onFlush = onFlush;
  }

  toString(): string {
    return `Directory(${JSON.stringify({ type: this.type, path: this.path })})`;
  }

  /**
   * Create a new sub-directory.
   */
  createDirectory(path: string): Directory {
    return new Directory({
      type: this.type,
      path: getFullPath(this.path, path),
      list: this._list,
      getOrCreateFile: this._getOrCreateFile,
      remove: this._remove,
    });
  }

  /**
   * Get all files in the current directory.
   */
  list(): Promise<string[]> {
    return this._list(this.path);
  }

  /**
   * Get or create a new file.
   */
  getOrCreateFile(filename: string, opts?: any): File {
    return this._getOrCreateFile(this.path, filename, opts);
  }

  async flush(): Promise<void> {
    await this._onFlush?.();
  }

  /**
   * Close and delete all files in the directory and all its sub-directories.
   */
  async delete(): Promise<void> {
    await this._remove();
  }
}
