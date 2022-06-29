//
// Copyright 2021 DXOS.org
//

import { Directory } from '../interfaces/Directory';
import { Storage } from '../interfaces/Storage';
import { StorageType } from '../interfaces/storage-types';
import { getFullPath } from '../utils';

/**
 * Base class for all storage implementations.
 */
export abstract class AbstractStorage implements Storage {
  protected readonly _directories = new Map<string, Directory>();
  public abstract type: StorageType

  constructor (protected readonly _path: string) {
  }

  public directory (path = ''): Directory {
    const fullPath = getFullPath(this._path, path);
    if (this._directories.has(fullPath)) {
      return this._directories.get(fullPath)!;
    } else {
      const directory = this._createDirectory(fullPath);
      this._directories.set(fullPath, directory);
      return directory;
    }
  }

  async destroy () {
    try {
      await this._closeDirectories();
      await this._destroyDirectories();
      await this._destroy();
      this._directories.clear();
    } catch (error: any) {
      console.error(error);
    }
  }

  private _closeDirectories () {
    return Promise.all(
      Array.from(this._directories.values())
        .map(directory => directory._close().catch((error: any) => console.error(error.message)))
    );
  }

  private _destroyDirectories () {
    return Promise.all(
      Array.from(this._directories.values())
        .map(directory => directory._destroy().catch((error: any) => console.error(error.message)))
    );
  }

  public abstract _createDirectory (path: string): Directory
  protected abstract _destroy (): Promise<void>;
}
