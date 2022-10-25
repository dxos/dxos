//
// Copyright 2021 DXOS.org
//

import { join } from 'node:path';
import type { RandomAccessStorage } from 'random-access-storage';

import { log } from '@dxos/log';

import { Directory } from './directory';
import { File, wrapFile } from './file';
import { Storage, StorageType } from './storage';
import { getFullPath } from './utils';

/**
 * Base class for all storage implementations.
 * https://github.com/random-access-storage
 * https://github.com/random-access-storage/random-access-storage
 */
export abstract class AbstractStorage implements Storage {
  protected readonly _files = new Map<string, File>();

  public abstract readonly type: StorageType;

  // TODO(burdon): Make required.
  constructor(protected readonly path: string) {}

  toString() {
    return `Storage(${JSON.stringify({ type: this.type, path: this.path })})`;
  }

  public get size() {
    return this._files.size;
  }

  // TODO(burdon): Make required.
  public createDirectory(sub = ''): Directory {
    // assert(sub.length);
    return new Directory(
      this.type,
      getFullPath(this.path, sub),
      () => Array.from(this._getFiles(sub).values()),
      (...args) => this.getOrCreateFile(...args),
      () => this._delete(sub)
    );
  }

  async destroy() {
    try {
      await this._closeFilesInPath('');
      await this._delete('');
      await this._destroy();
    } catch (err: any) {
      log.catch(err);
    }
  }

  protected getOrCreateFile(path: string, filename: string, opts?: any): File {
    const fullPath = join(path, filename);

    let native;
    let file = this._getFileIfExists(fullPath);
    if (file) {
      if (!file.closed) {
        return file;
      }

      native = this._openFile(file.native);
    }

    if (!native) {
      native = this._createFile(path, filename, opts);
    }

    file = wrapFile(native, this.type);
    this._files.set(fullPath, file);
    return file;
  }

  protected _destroy(): Promise<void> | undefined {
    return undefined;
  }

  /**
   * Attempt to reopen file.
   */
  protected _openFile(
    file: RandomAccessStorage
  ): RandomAccessStorage | undefined {
    return undefined;
  }

  protected abstract _createFile(
    path: string,
    filename: string,
    opts?: any
  ): RandomAccessStorage;

  private _getFileIfExists(filename: string): File | undefined {
    if (this._files.has(filename)) {
      const file = this._files.get(filename);
      if (file && !file.destroyed) {
        return file;
      }
    }
  }

  private _getFiles(path: string): Map<string, File> {
    const fullPath = getFullPath(this.path, path);
    return new Map(
      Array.from(this._files.entries()).filter(([path]) => {
        return path.includes(fullPath);
      })
    );
  }

  private async _closeFilesInPath(path: string): Promise<void> {
    await Promise.all(
      Array.from(this._getFiles(path).values()).map((file) =>
        file.close().catch((err: any) => log.catch(err))
      )
    );
  }

  // TODO(burdon): Delete directory (not just listed files).
  protected async _delete(path: string): Promise<void> {
    await Promise.all(
      Array.from(this._getFiles(path)).map(([path, file]) => {
        return file
          .destroy()
          .then(() => this._files.delete(path))
          .catch((err: any) => log.error(err.message));
      })
    );
  }
}
