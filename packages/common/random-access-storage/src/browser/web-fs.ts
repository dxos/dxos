//
// Copyright 2023 DXOS.org
//

import { EventEmitter } from 'node:events';
import { callbackify } from 'node:util';
import { type RandomAccessStorage } from 'random-access-storage';

import { synchronized } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { TimeSeriesCounter, trace } from '@dxos/tracing';

import { Directory, type DiskInfo, type File, type Storage, StorageType, getFullPath } from '../common';

/**
 * Web file systems.
 */
export class WebFS implements Storage {
  readonly type = StorageType.WEBFS;

  protected readonly _files = new Map<string, WebFile>();
  protected _root?: FileSystemDirectoryHandle;

  constructor(public readonly path: string) {}

  public get size() {
    return this._files.size;
  }

  private _getFiles(path: string): Map<string, WebFile> {
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
      async () => {
        await Promise.all(Array.from(this._getFiles(sub)).map(([path, file]) => file.flush()));
      },
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
      fileName: fullName,
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

// TODO(mykola): Remove EventEmitter.
@trace.resource()
export class WebFile extends EventEmitter implements File {
  @trace.info()
  private readonly _fileName: string;

  private readonly _fileHandle: Promise<FileSystemFileHandle>;
  private readonly _destroy: () => Promise<void>;

  /**
   * Current view of the file contents.
   */
  private _buffer: Uint8Array | null = null;

  private _loadBufferPromise: Promise<void> | null = null;

  private _flushScheduled = false;

  private _flushPromise: Promise<void> | null = null;

  //
  // Metrics
  //

  @trace.metricsCounter()
  private _flushes = new TimeSeriesCounter();

  @trace.metricsCounter()
  private _operations = new TimeSeriesCounter();

  @trace.metricsCounter()
  private _reads = new TimeSeriesCounter();

  @trace.metricsCounter()
  private _readBytes = new TimeSeriesCounter();

  @trace.metricsCounter()
  private _writes = new TimeSeriesCounter();

  @trace.metricsCounter()
  private _writeBytes = new TimeSeriesCounter();

  @trace.info()
  get _bufferSize() {
    return this._buffer?.length;
  }

  constructor({
    fileName,
    file,
    destroy,
  }: {
    file: Promise<FileSystemFileHandle>;
    fileName: string;
    destroy: () => Promise<void>;
  }) {
    super();
    this._fileName = fileName;
    this._fileHandle = file;
    this._destroy = destroy;

    void this._loadBufferGuarded();
  }

  type: StorageType = StorageType.WEBFS;

  //
  // random-access-storage library compatibility
  //

  // TODO(dmaretskyi): Are those all needed?
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

  destroyed = false;
  directory = '';
  // TODO(dmaretskyi): is this used?
  filename = '';
  native: RandomAccessStorage = {
    write: callbackify(this.write.bind(this)),
    read: callbackify(this.read.bind(this)),
    del: callbackify(this.del.bind(this)),
    stat: callbackify(this.stat.bind(this)),
    destroy: callbackify(this.destroy.bind(this)),
    truncate: callbackify(this.truncate?.bind(this)),
  } as RandomAccessStorage;

  private async _loadBuffer() {
    const fileHandle = await this._fileHandle;
    const file = await fileHandle.getFile();
    this._buffer = new Uint8Array(await file.arrayBuffer());
  }

  private async _loadBufferGuarded() {
    await (this._loadBufferPromise ??= this._loadBuffer());
  }

  // Do not call directly, use _flushLater or _flushNow.
  private async _flushCache() {
    if (this.destroyed) {
      return;
    }

    this._flushes.inc();

    await this._loadBufferGuarded();
    invariant(this._buffer);

    const fileHandle = await this._fileHandle;
    const writable = await fileHandle.createWritable({ keepExistingData: true });
    await writable.write({ type: 'write', data: this._buffer, position: 0 });
    await writable.close();
  }

  private _flushLater() {
    if (this._flushScheduled) {
      return;
    }

    setTimeout(async () => {
      // Making sure only one flush can run at a time.
      const promiseBefore = this._flushPromise;
      await this._flushPromise;
      this._flushScheduled = false;

      // _flushNow might have been called. In that case we don't want to run the flush again.
      if (promiseBefore !== this._flushPromise) {
        return;
      }

      this._flushPromise = this._flushCache().catch((err) => log.warn(err));
    });

    this._flushScheduled = true;
  }

  private async _flushNow() {
    this._flushPromise = (this._flushPromise ?? Promise.resolve())
      .then(() => this._flushCache())
      .catch((err) => log.warn(err));

    await this._flushPromise;
  }

  async read(offset: number, size: number) {
    this._operations.inc();
    this._reads.inc();
    this._readBytes.inc(size);

    if (!this._buffer) {
      await this._loadBufferGuarded();
      invariant(this._buffer);
    }

    if (offset + size > this._buffer.length) {
      throw new Error('Read out of bounds');
    }

    // Copy data into a new buffer.
    return Buffer.from(this._buffer.slice(offset, offset + size));
  }

  async write(offset: number, data: Buffer) {
    this._operations.inc();
    this._writes.inc();
    this._writeBytes.inc(data.length);

    if (!this._buffer) {
      await this._loadBufferGuarded();
      invariant(this._buffer);
    }

    if (offset + data.length <= this._buffer.length) {
      this._buffer.set(data, offset);
    } else {
      // TODO(dmaretskyi): Optimize re-allocations.
      const newCache = new Uint8Array(offset + data.length);
      newCache.set(this._buffer);
      newCache.set(data, offset);
      this._buffer = newCache;
    }

    this._flushLater();
  }

  async del(offset: number, size: number) {
    this._operations.inc();

    if (offset < 0 || size < 0) {
      return;
    }

    if (!this._buffer) {
      await this._loadBufferGuarded();
      invariant(this._buffer);
    }

    let leftoverSize = 0;
    if (offset + size < this._buffer.length) {
      leftoverSize = this._buffer.length - (offset + size);
      this._buffer.set(this._buffer.slice(offset + size, offset + size + leftoverSize), offset);
    }

    this._buffer = this._buffer.slice(0, offset + leftoverSize);

    this._flushLater();
  }

  async stat() {
    this._operations.inc();

    // NOTE: This will load all data from the file just to get it's size. While this is a lot of overhead, this works ok for out use cases.
    if (!this._buffer) {
      await this._loadBufferGuarded();
      invariant(this._buffer);
    }

    return {
      size: this._buffer.length,
    };
  }

  async truncate(offset: number) {
    this._operations.inc();

    if (!this._buffer) {
      await this._loadBufferGuarded();
      invariant(this._buffer);
    }

    this._buffer = this._buffer.slice(0, offset);

    this._flushLater();
  }

  async flush() {
    await this._flushNow();
  }

  async close(): Promise<void> {
    await this._flushNow();
  }

  @synchronized
  async destroy() {
    this.destroyed = true;
    return await this._destroy();
  }
}
