//
// Copyright 2021 DXOS.org
//

import { log } from '@dxos/log';

import { Directory, File, Storage, StorageType } from '../api';
import { getFullPath } from '../utils';

/**
 * Base class for all storage implementations.
 * https://www.npmjs.com/package/abstract-random-access
 */
export abstract class AbstractStorage implements Storage {
  public abstract type: StorageType

  protected readonly _files = new Map<string, File>();

  constructor (protected readonly _path: string) {}

  public directory (path = ''): Directory {
    return new Directory(
      getFullPath(this._path, path),
      this._createFile.bind(this),
      this._destroyFilesInPath.bind(this)
    );
  }

  async destroy () {
    try {
      await this._closeFilesInPath('');
      await this._destroyFilesInPath('');
      await this._destroy();
    } catch (err: any) {
      log.catch(err);
    }
  }

  protected abstract _createFile (filename: string, path: string, opts?: any): File;

  protected abstract _destroy (): Promise<void>;

  protected _getFileIfExists (filename: string): File | undefined {
    if (this._files.has(filename)) {
      const file = this._files.get(filename);
      if (file && !file._isDestroyed()) {
        return file;
      }
    }
  }

  private _getFilesInPath (path: string): Map<string, File> {
    const fullPath = getFullPath(this._path, path);
    return new Map(
      [...this._files].filter(([filePath, _]) => filePath.includes(fullPath))
    );
  }

  protected _addFile (filename: string, file: File) {
    this._files.set(filename, file);
  }

  private async _closeFilesInPath (path: string) {
    const filesInPath = Array.from(this._getFilesInPath(path).values());
    await Promise.all(filesInPath.map(
      file => file.close().catch((error: any) => log.catch(error))
    ));
  }

  protected async _destroyFilesInPath (path: string) {
    const filesInPath = this._getFilesInPath(path);
    const promise = this._closeFilesInPath(path);
    Array.from(filesInPath.keys()).forEach(filePath => this._files.delete(filePath));
    await promise;
  }
}
