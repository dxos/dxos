//
// Copyright 2021 DXOS.org
//

import { Directory, File } from '../interfaces';
import { Storage } from '../interfaces/Storage';
import { StorageType } from '../interfaces/storage-types';

/**
 * Base class for all storage implementations.
 */
export abstract class AbstractStorage implements Storage {
  protected readonly _files = new Map<string, File>();
  public abstract type: StorageType

  constructor (protected readonly _path: string) {
  }

  _getFileIfExists (filename: string): File | null {
    if (this._files.has(filename)) {
      const file = this._files.get(filename);
      if (file && !file._isDestroyed()) {
        return file;
      }
    }
    return null;
  }

  _addFile (filename: string, file: File) {
    this._files.set(filename, file);
  }

  async destroy () {
    try {
      await this._closeFiles();
      await this._destroyFiles();
      await this._destroy();
      this._files.clear();
    } catch (error: any) {
      console.error(error);
    }
  }

  private _closeFiles () {
    return Promise.all(
      Array.from(this._files.values())
        .map(file => file.close().catch((error: any) => console.error(error.message)))
    );
  }

  private _destroyFiles () {
    return Promise.all(
      Array.from(this._files.values())
        .map(file => file.destroy().catch((error: any) => console.error(error.message)))
    );
  }

  public abstract directory (path?: string): Directory;
  protected abstract _destroy (): Promise<void>;
}
