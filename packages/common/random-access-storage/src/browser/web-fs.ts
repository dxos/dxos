//
// Copyright 2023 DXOS.org
//

import { EventEmitter } from 'node:events';
import { callbackify } from 'node:util';
import { FileStat, RandomAccessStorage } from 'random-access-storage';
import invariant from 'tiny-invariant';

import { Lock, synchronized } from '@dxos/async';
import { log } from '@dxos/log';

import { Directory, File, Storage, StorageType, getFullPath, DiskInfo } from '../common';

/**
 * Web file systems.
 */
export class WebFS implements Storage {
  readonly type = StorageType.WEBFS;

  protected readonly _files = new Map<string, File>();
  protected _root?: FileSystemDirectoryHandle;

  constructor(public readonly path: string) { }

  public get size() {
    return this._files.size;
  }

  private _getFiles(path: string): Map<string, File> {
    const fullName = this._getFullFilename(this.path, path);
    return new Map(
      [...this._files.entries()].filter(([path, file]) => path.includes(fullName) && file.destroyed !== true),
    );
  }

  private async _list(path: string): Promise<string[]> {
    const fullName = this._getFullFilename(path);

    const root = await this._initialize();

    // TODO(dmaretskyi): While we're storing all files in flat namespace we just iterate the root.
    // console.log({ path, fullName })
    // let dir: FileSystemDirectoryHandle;
    // if (path === '') {
    //   dir = root;
    // } else {
    //   dir = await root.getDirectoryHandle(fullName, { create: true });
    // }
    const entries: string[] = [];

    for await (const entry of (root as any).keys()) {
      if (entry.startsWith(fullName + '_')) {
        entries.push(entry.slice(fullName.length + 1));
      }
    }
    return entries;
  }

  @synchronized
  private async _initialize() {
    if (this._root) {
      return this._root;
    }
    this._root = await navigator.storage.getDirectory();
    invariant(this._root, 'Root is undefined');
    return this._root;
  }

  createDirectory(sub = '') {
    return new Directory(
      this.type,
      getFullPath(this.path, sub),
      (path) => this._list(path),
      (...args) => this.getOrCreateFile(...args),
      () => this._delete(sub),
    );
  }

  getOrCreateFile(path: string, filename: string, opts?: any): File {
    const fullName = this._getFullFilename(path, filename);
    const existingFile = this._files.get(fullName);
    if (existingFile) {
      return existingFile;
    }
    const file = this._createFile(fullName);
    this._files.set(fullName, file);
    return file;
  }

  private _createFile(fullName: string) {
    return new WebFile({
      file: this._initialize().then((root) => root.getFileHandle(fullName, { create: true })),
      destroy: async () => {
        this._files.delete(fullName);
        const root = await this._initialize();
        return root.removeEntry(fullName);
      },
    });
  }

  private async _delete(path: string): Promise<void> {
    await Promise.all(
      Array.from(this._getFiles(path)).map(async ([path, file]) => {
        await file.destroy().catch((err: any) => log.warn(err));
        this._files.delete(path);
      }),
    );
  }

  async reset() {
    await this._initialize();
    for await (const filename of await (this._root as any).keys()) {
      this._files.delete(filename);
      await this._root!.removeEntry(filename, { recursive: true }).catch((err: any) => log.warn(err));
    }
    this._root = undefined;
  }

  private _getFullFilename(path: string, filename?: string) {
    // Replace slashes with underscores. Because we can't have slashes in filenames in Browser File Handle API.
    if (filename) {
      return getFullPath(path, filename).split('/').join('_');
    } else {
      return path.split('/').join('_');
    }
  }

  async getDiskInfo(): Promise<DiskInfo> {
    let used = 0;

    const recurse = async (handle: FileSystemDirectoryHandle) => {
      const promises = [];

      for await (const entry of (handle as any).values()) {
        promises.push(
          (async () => {
            switch (entry.kind) {
              case 'file':
                used += await (entry as FileSystemFileHandle).getFile().then((f) => (used += f.size));
                break;
              case 'directory':
                await recurse(entry as FileSystemDirectoryHandle);
                break;
            }
          })(),
        );
      }
      await Promise.all(promises);
    };

    await recurse(this._root!);

    return {
      used,
    };
  }
}

type ReadOperation = (file: globalThis.File) => Promise<void>;
type WriteOperation = (file: FileSystemWritableFileStream) => Promise<void>;


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

  private readonly _lock = new Lock();

  private readonly _fileHandle: Promise<FileSystemFileHandle>;
  private readonly _destroy: () => Promise<void>;

  private readonly _readQueue: ReadOperation[] = [];
  private readonly _writeQueue: WriteOperation[] = [];

  constructor({ file, destroy }: { file: Promise<FileSystemFileHandle>; destroy: () => Promise<void> }) {
    super();
    this._fileHandle = file;
    this._destroy = destroy;
  }

  destroyed = false;
  directory = '';
  filename = '';
  type: StorageType = StorageType.WEBFS;
  native: RandomAccessStorage = {
    write: callbackify(this.write.bind(this)),
    read: callbackify(this.read.bind(this)),
    del: callbackify(this.del.bind(this)),
    stat: callbackify(this.stat.bind(this)),
    destroy: callbackify(this.destroy.bind(this)),
    truncate: callbackify(this.truncate?.bind(this)),
  } as RandomAccessStorage;

  private async _readOp(cb: ReadOperation) {
    this._readQueue.push(cb);

    if (this._readQueue.length > 1) { // Already processing
      return;
    }

    const release = await this._lock.acquire();

    const readHandle = await (await this._fileHandle).getFile();
    while (this._readQueue.length > 0) {
      const cb = this._readQueue.shift()!;
      await cb(readHandle);
    }

    release();
  }

  private async _writeOp(cb: WriteOperation) {
    this._writeQueue.push(cb);

    if (this._writeQueue.length > 1) { // Already processing
      return;
    }

    const release = await this._lock.acquire();

    const writeHandle = await (await this._fileHandle).createWritable({ keepExistingData: true });
    while (this._writeQueue.length > 0) {
      const cb = this._writeQueue.shift()!;
      await cb(writeHandle);
    }
    await writeHandle.close();

    release();
  }

  write(offset: number, data: Buffer) {
    return new Promise<void>((resolve, reject) => {
      this._writeOp(async (writable) => {
        try {
          await writable.write({ type: 'write', data, position: offset });
          resolve();
        } catch (err) {
          reject(err);
        }
      }).catch(reject);
    });
  }

  read(offset: number, size: number) {
    return new Promise<Buffer>((resolve, reject) => {
      this._readOp(async (file) => {
        try {
          if (offset + size > file.size) {
            throw new Error('Read out of bounds');
          }
          // does not copy the buffer
          const buffer = Buffer.from(await file.slice(offset, offset + size).arrayBuffer());
          resolve(buffer);
        } catch (err) {
          reject(err);
        }
      }).catch(reject);
    });
  }

  del(offset: number, size: number) {
    if (offset < 0 || size < 0) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      this._writeOp(async (writable) => {
        try {
          const file = await (await this._fileHandle).getFile();

          let leftoverSize = 0;
          if (offset + size < file.size) {
            // does not copy the buffer
            const leftover = Buffer.from(await file.slice(offset + size, file.size).arrayBuffer());
            leftoverSize = leftover.length;
            await writable.write({ type: 'write', data: leftover, position: offset });
          }

          await writable.write({ type: 'truncate', size: offset });
          resolve();
        } catch (err) {
          reject(err);
        }
      }).catch(reject);
    });
  }

  stat() {
    return new Promise<FileStat>((resolve, reject) => {
      this._readOp(async (file) => {
        try {
          resolve({
            size: file.size,
          });
        } catch (err) {
          reject(err);
        }
      }).catch(reject);
    });
  }

  async close(): Promise<void> { }

  async destroy() {
    return await this._lock.executeSynchronized(async () => {
      this.destroyed = true;

      return await this._destroy();
    });
  }

  truncate(offset: number) {
    return new Promise<void>((resolve, reject) => {
      this._writeOp(async (writable) => {
        try {
          await writable.write({ type: 'truncate', size: offset });
          resolve();
        } catch (err) {
          reject(err);
        }
      }).catch(reject);
    });
  }
}
