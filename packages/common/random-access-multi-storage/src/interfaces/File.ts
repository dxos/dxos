//
// Copyright 2022 DXOS.org
//

interface FileStat {
    size: number
  }

export interface FileInternal {
  read(offset: number, size: number, cb?: (err: Error | null, data?: Buffer) => void): void;

  write(offset: number, data: Buffer, cb?: (err: Error | null) => void): void;

  del(offset: number, data: Buffer, cb?: (err: Error | null) => void): void;

  stat(cb: (err: Error | null, data?: FileStat) => void): void;

  close(cb?: (err: Error | null) => void): void;

  destroy(cb?: (err: Error | null) => void): void
}

export class File {
  constructor (private readonly _fileInternal: FileInternal) {}

  private _createPromise<Type> (fileMethod: (...args: any[]) => void, cb?: (err: Error | null, data?: Type) => void, ...args: (number | Buffer)[]): Promise<Type> {
    const promise = new Promise<Type>(
      (resolve, reject) => {
        fileMethod(...args, (err: Error | null, data?: Type) => {
          cb?.(err, data);
          if (err) {
            return reject(err);
          }
          return resolve(data as Type);
        });
      });
    if (cb) {
      promise.catch((_) => {});
    }
    return promise;
  }

  read (offset: number, size: number, cb?: (err: Error | null, data?: Buffer) => void): Promise<Buffer> {
    return this._createPromise<Buffer>(this._fileInternal.read.bind(this._fileInternal), cb, offset, size);
  }

  write (offset: number, data: Buffer, cb?: (err: Error | null) => void): Promise<void> {
    return this._createPromise<void>(this._fileInternal.write.bind(this._fileInternal), cb, offset, data);
  }

  del (offset: number, data: Buffer, cb?: (err: Error | null) => void): Promise<void> {
    return this._createPromise<void>(this._fileInternal.del.bind(this._fileInternal), cb, offset, data);
  }

  stat (cb?: (err: Error | null, data?: FileStat) => void): Promise<FileStat> {
    return this._createPromise<FileStat>(this._fileInternal.stat.bind(this._fileInternal), cb);
  }

  close (cb?: (err: Error | null) => void): Promise<void> {
    return this._createPromise<void>(this._fileInternal.close.bind(this._fileInternal), cb);
  }

  destroy (cb?: (err: Error | null) => void): Promise<void> {
    return this._createPromise<void>(this._fileInternal.destroy.bind(this._fileInternal), cb);
  }
}
