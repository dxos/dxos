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

  constructor (protected readonly path: string) {}

  public get size () {
    return this._files.size;
  }

  public createDirectory (path = ''): Directory {
    return new Directory(
      getFullPath(this.path, path),
      () => [...this._getFilesInPath(path).values()],
      this._createFile.bind(this),
      () => this._deleteFilesInPath(path)
    );
  }

  async destroy () {
    try {
      await this._closeFilesInPath('');
      await this._deleteFilesInPath('');
      await this._destroy();
    } catch (err: any) {
      log.catch(err);
    }
  }

  protected abstract _createFile (filename: string, path: string, opts?: any): File;

  protected abstract _destroy (): Promise<void>;

  protected _addFile (filename: string, file: File) {
    this._files.set(filename, file);
  }

  protected _getFileIfExists (filename: string): File | undefined {
    if (this._files.has(filename)) {
      const file = this._files.get(filename);
      if (file && !file._isDestroyed()) {
        return file;
      }
    }
  }

  private _getFilesInPath (path: string): Map<string, File> {
    const fullPath = getFullPath(this.path, path);
    return new Map(
      [...this._files].filter(([path]) => path.includes(fullPath))
    );
  }

  private async _closeFilesInPath (path: string): Promise<void> {
    await Promise.all([...this._getFilesInPath(path).values()].map(
      file => file.close().catch((err: any) => log.catch(err))
    ));
  }

  protected async _deleteFilesInPath (path: string): Promise<void> {
    await Promise.all([...this._getFilesInPath(path)].map(([path, file]) => {
      return file.delete()
        .then(() => this._files.delete(path))
        .catch((error: any) => log.error(error.message));
    }));
  }
}
