//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';
import EventEmitter from 'node:events';
import { RandomAccessStorage } from 'random-access-storage';

import { synchronized } from '@dxos/async';
import { log } from '@dxos/log';

import { Directory, File, Storage, StorageType, getFullPath } from '../common';

/**
 *
 */
export class WebFS implements Storage {
  readonly type = StorageType.WEBFS;

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
      return this._root;
    }
    this._root = await navigator.storage.getDirectory();
    assert(this._root, 'Root is undefined');
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
    const fullPath = getFullPath(path, filename);
    // Replace slashes with underscores. Because we can't have slashes in filenames in Browser File Handle API.
    const fullFilename = fullPath.split('/').join('_');
    const existingFile = this._files.get(fullPath);
    if (existingFile) {
      return existingFile;
    }
    const file = new WebFile({
      file: this._initialize().then((root) => root.getFileHandle(fullFilename, { create: true })),
      destroy: async () => {
        this._files.delete(fullPath);
        const root = await this._initialize();
        return root.removeEntry(fullFilename);
      }
    });
    this._files.set(fullPath, file);
    return file;
  }

  private async _delete(path: string): Promise<void> {
    await Promise.all(
      Array.from(this._getFiles(path)).map(async ([path, file]) => {
        await file.destroy().catch((err: any) => log.catch(err));
        this._files.delete(path);
      })
    );
  }

  async reset() {
    await this._delete('');
    this._root = undefined;
  }
}

// TODO(mykola): Remove EventEmitter.
export class WebFile extends EventEmitter implements File {
  readonly opened: boolean = true;
  readonly suspended: boolean = false;
  readonly closed: boolean = false;
  readonly unlinked: boolean = false;
  readonly writing: boolean = false;
  readonly readable: boolean = true;
  readonly writable: boolean = true;
  readonly deletable: boolean = true;
  readonly truncatable: boolean = true;
  readonly statable: boolean = true;

  private readonly _fileHandle: Promise<FileSystemFileHandle>;
  private readonly _destroy: () => Promise<void>;

  constructor({ file, destroy }: { file: Promise<FileSystemFileHandle>; destroy: () => Promise<void> }) {
    super();
    this._fileHandle = file;
    this._destroy = destroy;
  }

  destroyed = false;
  directory = '';
  filename = '';
  type: StorageType = StorageType.WEBFS;
  native: RandomAccessStorage = {} as RandomAccessStorage;

  async write(offset: number, data: Buffer) {
    // TODO(mykola): Fix types.
    const fileHandle: any = await this._fileHandle;
    const writable = await fileHandle.createWritable({ keepExistingData: true });
    await writable.write({ type: 'write', data, position: offset });
    await writable.close();
  }

  async read(offset: number, size: number) {
    const fileHandle: any = await this._fileHandle;
    const file = await fileHandle.getFile();
    return Buffer.from(new Uint8Array(await file.slice(offset, offset + size).arrayBuffer()));
  }

  async del(offset: number, size: number) {
    const fileHandle: any = await this._fileHandle;
    const writable = await fileHandle.createWritable({ keepExistingData: true });
    await writable.write({ type: 'truncate', size: offset });
    await writable.close();
  }

  async stat() {
    const fileHandle: any = await this._fileHandle;
    const file = await fileHandle.getFile();
    return {
      size: file.size
    };
  }

  async close(): Promise<void> {}

  async destroy() {
    return await this._destroy();
  }

  async truncate?(offset: number) {
    throw new Error('Method not implemented.');
  }
}
