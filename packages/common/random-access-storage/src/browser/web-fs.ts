//
// Copyright 2023 DXOS.org
//

import { Callback, FileStat } from 'random-access-storage';

import { synchronized } from '@dxos/async';
import { log } from '@dxos/log';

import { Directory, File, Storage, StorageType, getFullPath } from '../common';

/**
 *
 */
export class WebFS implements Storage {
s  readonly type = StorageType.WEBFS;

  protected readonly _files = new Map<string, File>();
  protected _root?: FileSystemDirectoryHandle;

  constructor(private readonly path: string) {}

  public get size() {
    return this._files.size;
  }

  private _getFiles(path: string): Map<string, File> {
    const fullPath = getFullPath(this.path, path);
    return new Map(
      [...this._files.entries()].filter(([path, file]) => path.includes(fullPath) && file.destroyed !== true)
    );
  }

  @synchronized
  private async _initialize() {
    if (this._root) {
      return;
    }
    this._root = await navigator.storage.getDirectory();
    return this._root;
  }

  createDirectory(sub = '') {
    return new Directory(
      this.type,
      getFullPath(this.path, sub),
      () => this._getFiles(sub),
      (...args) => this.getOrCreateFile(...args),
      () => this._delete(sub)
    );
  }

  getOrCreateFile(path: string, filename: string, opts?: any): File {
    return new WebFile(this._initialize().then((root) => root.getFileHandle(filename, { create: true })));
  }

  private async _delete(path: string): Promise<void> {
    await Promise.all(
      Array.from(this._getFiles(path)).map(([path, file]) => {
        return file
          .destroy()
          .then(() => this._files.delete(path))
          .catch((err: any) => log.error(err.message));
      })
    );
  }

  async reset() {}
}

export class WebFile implements File {
  readonly opened: boolean;
  readonly suspended: boolean;
  readonly closed: boolean;
  readonly unlinked: boolean;
  readonly writing: boolean;

  readonly readable: boolean;
  readonly writable: boolean;
  readonly deletable: boolean;
  readonly truncatable: boolean;
  readonly statable: boolean;

  constructor(private readonly _file: Promise<FileSystemFileHandle>) {
    this.opened = true;
    this.suspended = false;
    this.closed = false;
    this.unlinked = false;
    this.writing = false;

    this.readable = true;
    this.writable = true;
    this.deletable = true;
    this.truncatable = true;
    this.statable = true;
  }

  async write(offset: number, data: Buffer) {
    const fileHandle: any = await this._file;
    const writable = await fileHandle.createWritable(true);
    await writable.write(data, offset);
    await writable.close();
  }

  async read(offset: number, size: number) {
    const fileHandle: any = await this._file;
    const file = await fileHandle.getFile();
    return file.slice(offset, offset + size);
  }

  async del(offset: number, size: number) {
    throw new Error('Method not implemented.');
  }

  async stat(cb: Callback<FileStat>) {
    throw new Error('Method not implemented.');
  }

  async close(cb: Callback<Error>) {
    throw new Error('Method not implemented.');
  }

  async destroy(cb: Callback<Error>) {
    throw new Error('Method not implemented.');
  }

  async truncate?(offset: number) {
    throw new Error('Method not implemented.');
  }
}
