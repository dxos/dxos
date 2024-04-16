//
// Copyright 2021 DXOS.org
//

import { join } from 'node:path';
import { inspect } from 'node:util';
import type { RandomAccessStorage } from 'random-access-storage';

import { inspectObject } from '@dxos/debug';
import { log } from '@dxos/log';

import { Directory } from './directory';
import { type File, wrapFile } from './file';
import { type Storage, type StorageType } from './storage';
import { getFullPath } from './utils';

/**
 * Base class for all storage implementations.
 * https://github.com/random-access-storage
 * https://github.com/random-access-storage/random-access-storage
 */
// TODO(dmaretskyi): Remove this class.
export abstract class AbstractStorage implements Storage {
  protected readonly _files = new Map<string, File>();

  public abstract readonly type: StorageType;

  // TODO(burdon): Make required.
  constructor(public readonly path: string) {}

  [inspect.custom]() {
    return inspectObject(this);
  }

  toJSON() {
    return { type: this.type, path: this.path };
  }

  public get size() {
    return this._files.size;
  }

  // TODO(burdon): Make required.
  public createDirectory(sub = ''): Directory {
    // invariant(sub.length);
    return new Directory({
      type: this.type,
      path: getFullPath(this.path, sub),
      list: this._list.bind(this),
      getOrCreateFile: (...args) => this.getOrCreateFile(...args),
      remove: () => this._remove(sub),
    });
  }

  /**
   * Delete all files.
   */
  async reset() {
    try {
      log.info('Erasing all data...');
      await this._closeFilesInPath('');
      await this._remove('');
      await this._destroy();
      log('Erased...');
    } catch (err: any) {
      log.catch(err);
    }
  }

  protected async _list(path: string): Promise<string[]> {
    // TODO(dmaretskyi): Fix me.
    return Array.from((await this._getFiles(path)).keys()).map((filename) => {
      let name = filename.replace(path, '');
      if (name.startsWith('/')) {
        name = name.substring(1);
      }
      return name;
    });
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
  protected _openFile(file: RandomAccessStorage): RandomAccessStorage | undefined {
    return undefined;
  }

  protected abstract _createFile(path: string, filename: string, opts?: any): RandomAccessStorage;

  private _getFileIfExists(filename: string): File | undefined {
    if (this._files.has(filename)) {
      const file = this._files.get(filename);
      if (file && !file.destroyed) {
        return file;
      }
    }
  }

  protected async _getFiles(path: string): Promise<Map<string, File>> {
    const fullPath = getFullPath(this.path, path);
    return new Map(
      [...this._files.entries()].filter(([path, file]) => path.includes(fullPath) && file.destroyed !== true),
    );
  }

  protected async _closeFilesInPath(path: string): Promise<void> {
    await Promise.all(
      Array.from((await this._getFiles(path)).values()).map((file) => file.close().catch((err: any) => log.catch(err))),
    );
  }

  async close() {
    await this._closeFilesInPath('');
  }

  // TODO(burdon): Delete directory (not just listed files).
  protected async _remove(path: string): Promise<void> {
    await Promise.all(
      Array.from(await this._getFiles(path)).map(([path, file]) => {
        return file
          .destroy()
          .then(() => this._files.delete(path))
          .catch((err: any) => log.error(err.message));
      }),
    );
  }
}
