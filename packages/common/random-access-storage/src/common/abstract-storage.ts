//
// Copyright 2021 DXOS.org
//

import { join } from 'node:path';

import { log } from '@dxos/log';

import { RandomAccessFile } from '../types';
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

  public readonly abstract type: StorageType

  constructor (
    protected readonly path: string
  ) {}

  public get size () {
    return this._files.size;
  }

  public createDirectory (sub = ''): Directory {
    return new Directory(
      getFullPath(this.path, sub),
      () => Array.from(this._getFilesInPath(sub).values()),
      (...args) => this.getOrCreateFile(...args),
      () => this._deleteFilesInPath(sub)
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

  protected getOrCreateFile (path: string, filename: string, opts?: any): File {
    const fullPath = join(path, filename);

    // TODO(burdon): Check if closed. Clone only if ram.
    // Some variants (e.g., Node) do not allow files to be reopened.
    let file = this._getFileIfExists(fullPath);
    if (file && file?.clone) {
      file = wrapFile(file.clone(), file.type);
    } else {
      const raw = this._createFile(path, filename, opts);
      file = wrapFile(raw, this.type);
      this._files.set(fullPath, file);
    }

    return file;
  }

  protected _destroy (): Promise<void> | undefined {
    return undefined;
  }

  protected abstract _createFile (path: string, filename: string, opts?: any): RandomAccessFile;

  private _getFileIfExists (filename: string): File | undefined {
    if (this._files.has(filename)) {
      const file = this._files.get(filename);
      if (file && !file.destroyed) {
        return file;
      }
    }
  }

  private _getFilesInPath (path: string): Map<string, File> {
    const fullPath = getFullPath(this.path, path);
    return new Map(
      Array.from(this._files.entries()).filter(([path]) => {
        return path.includes(fullPath);
      })
    );
  }

  private async _closeFilesInPath (path: string): Promise<void> {
    await Promise.all(Array.from(this._getFilesInPath(path).values()).map(
      file => file.close().catch((err: any) => log.catch(err))
    ));
  }

  protected async _deleteFilesInPath (path: string): Promise<void> {
    await Promise.all(Array.from(this._getFilesInPath(path)).map(([path, file]) => {
      return file.destroy()
        .then(() => this._files.delete(path))
        .catch((err: any) => log.error(err.message));
    }));
  }
}
