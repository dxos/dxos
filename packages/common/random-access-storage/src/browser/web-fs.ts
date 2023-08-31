//
// Copyright 2023 DXOS.org
//

import { EventEmitter } from 'node:events';
import { callbackify } from 'node:util';
import { RandomAccessStorage } from 'random-access-storage';

import { synchronized } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { TimeSeriesCounter, TimeUsageCounter, trace } from '@dxos/tracing';

import { Directory, File, Storage, StorageType, getFullPath, DiskInfo } from '../common';
import { STORAGE_MONITOR } from '../monitor';

/**
 * Web file systems.
 */
export class WebFS implements Storage {
  readonly type = StorageType.WEBFS;

  protected readonly _files = new Map<string, File>();
  protected _root?: FileSystemDirectoryHandle;

  constructor(public readonly path: string) {}

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
  @trace.info()
  private readonly _fileName: string;

  private readonly _fileHandle: Promise<FileSystemFileHandle>;
  private readonly _destroy: () => Promise<void>;

  @trace.metricsCounter()
  private _usage = new TimeUsageCounter();

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
  }

  destroyed = false;
  directory = '';
  // TODO(dmaretskyi): is this used?
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

  @synchronized
  async write(offset: number, data: Buffer) {
    const span = this._usage.beginRecording();
    this._operations.inc();
    this._writes.inc();
    this._writeBytes.inc(data.length);

    const metric = STORAGE_MONITOR.beginOp({ resource: this._fileName, type: 'write', size: data.length });
    try {
      // TODO(mykola): Fix types.
      const fileHandle: any = await this._fileHandle;
      const writable = await fileHandle.createWritable({ keepExistingData: true });
      await writable.write({ type: 'write', data, position: offset });
      await writable.close();
    } finally {
      span.end();
      metric.end();
    }
  }

  @synchronized
  async read(offset: number, size: number) {
    const span = this._usage.beginRecording();
    this._operations.inc();
    this._reads.inc();
    this._readBytes.inc(size);

    const metric = STORAGE_MONITOR.beginOp({ resource: this._fileName, type: 'read', size });
    try {
      const fileHandle: any = await this._fileHandle;
      const file = await fileHandle.getFile();
      if (offset + size > file.size) {
        throw new Error('Read out of bounds');
      }
      // does not copy the buffer
      return Buffer.from(await file.slice(offset, offset + size).arrayBuffer());
    } finally {
      span.end();
      metric.end();
    }
  }

  @synchronized
  async del(offset: number, size: number) {
    const span = this._usage.beginRecording();
    this._operations.inc();

    const metric = STORAGE_MONITOR.beginOp({ resource: this._fileName, type: 'delete', size });
    try {
      if (offset < 0 || size < 0) {
        return;
      }
      const fileHandle: any = await this._fileHandle;
      const writable = await fileHandle.createWritable({ keepExistingData: true });
      const file = await fileHandle.getFile();
      let leftoverSize = 0;
      if (offset + size < file.size) {
        // does not copy the buffer
        const leftover = Buffer.from(await file.slice(offset + size, file.size).arrayBuffer());
        leftoverSize = leftover.length;
        await writable.write({ type: 'write', data: leftover, position: offset });
      }

      await writable.write({ type: 'truncate', size: offset + leftoverSize });
      await writable.close();
    } finally {
      span.end();
      metric.end();
    }
  }

  @synchronized
  async stat() {
    const span = this._usage.beginRecording();
    this._operations.inc();

    const metric = STORAGE_MONITOR.beginOp({ resource: this._fileName, type: 'stat' });
    try {
      const fileHandle: any = await this._fileHandle;
      const file = await fileHandle.getFile();
      return {
        size: file.size,
      };
    } finally {
      span.end();
      metric.end();
    }
  }

  @synchronized
  async truncate(offset: number) {
    const span = this._usage.beginRecording();
    this._operations.inc();

    const metric = STORAGE_MONITOR.beginOp({ resource: this._fileName, type: 'truncate' });
    try {
      const fileHandle: any = await this._fileHandle;
      const writable = await fileHandle.createWritable({ keepExistingData: true });
      await writable.write({ type: 'truncate', size: offset });
      await writable.close();
    } finally {
      span.end();
      metric.end();
    }
  }

  async close(): Promise<void> {}

  @synchronized
  async destroy() {
    this.destroyed = true;
    return await this._destroy();
  }
}
