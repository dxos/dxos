//
// Copyright 2022 DXOS.org
//

export interface FileStat {
    size: number
  }

interface Callback<DataType> {
  (err: Error | null, data?: DataType): void;
}

export interface FileInternal {
  read(offset: number, size: number, cb?: Callback<Buffer>): void;

  write(offset: number, data: Buffer, cb?: Callback<void>): void;

  del(offset: number, data: Buffer, cb?: Callback<void>): void;

  stat(cb: Callback<FileStat>): void;

  close(cb?: Callback<void>): void;

  destroy(cb?: Callback<void>): void

  closed: boolean;
  destroyed: boolean;
}

export class File {
  constructor (protected readonly _fileInternal: FileInternal) {}

  _isDestroyed () {
    return this._fileInternal.destroyed;
  }

  _reopen () {
    if (this._isDestroyed()) {
      throw new Error('File is destroyed');
    }
    this._fileInternal.closed = false;
  }

  private _createPromise<Type> (fileMethod: (...args: any[]) => void, cb?: Callback<Type>, ...args: (number | Buffer)[]): Promise<Type> {
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

  read (offset: number, size: number, cb?: Callback<Buffer>): Promise<Buffer> {
    return this._createPromise<Buffer>(this._fileInternal.read.bind(this._fileInternal), cb, offset, size);
  }

  write (offset: number, data: Buffer, cb?: Callback<void>): Promise<void> {
    return this._createPromise<void>(this._fileInternal.write.bind(this._fileInternal), cb, offset, data);
  }

  del (offset: number, data: Buffer, cb?: Callback<void>): Promise<void> {
    return this._createPromise<void>(this._fileInternal.del.bind(this._fileInternal), cb, offset, data);
  }

  stat (cb?: Callback<FileStat>): Promise<FileStat> {
    return this._createPromise<FileStat>(this._fileInternal.stat.bind(this._fileInternal), cb);
  }

  close (cb?: Callback<void>): Promise<void> {
    return this._createPromise<void>(this._fileInternal.close.bind(this._fileInternal), cb);
  }

  destroy (cb?: Callback<void>): Promise<void> {
    return this._createPromise<void>(this._fileInternal.destroy.bind(this._fileInternal), cb);
  }
}
