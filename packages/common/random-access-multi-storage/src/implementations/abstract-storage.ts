//
// Copyright 2021 DXOS.org
//

import { Directory, File } from '../interfaces';
import { Storage } from '../interfaces/Storage';
import { StorageType } from '../interfaces/storage-types';
import { getFullPath } from '../utils';

/**
 * Base class for all storage implementations.
 */
export abstract class AbstractStorage implements Storage {
  protected readonly _files = new Map<string, File>();
  public abstract type: StorageType

  constructor (protected readonly _path: string) {
  }

  public directory (path = ''): Directory {
    return new Directory(
      getFullPath(this._path, path),
      this._createFile.bind(this),
      this._destroyFilesInPath.bind(this));
  }

  protected _getFileIfExists (filename: string): File | null {
    if (this._files.has(filename)) {
      const file = this._files.get(filename);
      if (file && !file._isDestroyed()) {
        return file;
      }
    }
    return null;
  }

  protected _addFile (filename: string, file: File) {
    this._files.set(filename, file);
  }

  async destroy () {
    try {
      await this._closeFilesInPath('');
      await this._destroyFilesInPath('');
      await this._destroy();
    } catch (error: any) {
      console.error(error);
    }
  }

  private _closeFilesInPath (path: string) {
    const filesInPath = this._selectFilesInPath(path);
    return Promise.all(
      Array.from(filesInPath.values())
        .map(file => file.close().catch((error: any) => console.error(error.message)))
    );
  }

  protected _destroyFilesInPath (path: string) {
    const filesInPath = this._selectFilesInPath(path);
    const destroyPromise = Promise.all(
      Array.from(filesInPath.values())
        .map(file => file.delete().catch((error: any) => console.error(error.message)))
    );
    Array.from(filesInPath.keys()).forEach(filePath => this._files.delete(filePath));
    return destroyPromise;
  }

  private _selectFilesInPath (path: string): Map<string, File> {
    const fullPath = getFullPath(this._path, path);
    return new Map([...this._files].filter(([filePath, _]) => filePath.includes(fullPath)));
  }

  protected abstract _createFile (filename: string, path: string, opts?: any): File;
  protected abstract _destroy (): Promise<void>;
}
