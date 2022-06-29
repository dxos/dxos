//
// Copyright 2022 DXOS.org
//
import { FileInternal } from '../internal';
import { Callback, FileStat } from '../types';

export class File {
  constructor (protected readonly _fileInternal: FileInternal) {}

  /**
   * @internal
   */
  _isDestroyed () {
    return this._fileInternal.destroyed;
  }

  /**
   * @internal
   * Only to be used in RamStorage and IDb implementation.
   * TODO(mykola): Don`t know if will work with others.
   */
  _reopen () {
    if (this._isDestroyed()) {
      throw new Error('File is destroyed');
    }
    this._fileInternal.closed = false;
  }

  read (offset: number, size: number, cb?: Callback<Buffer>): Promise<Buffer> {
    return createPromise<Buffer>(this._fileInternal.read.bind(this._fileInternal), cb, offset, size);
  }

  write (offset: number, data: Buffer, cb?: Callback<void>): Promise<void> {
    return createPromise<void>(this._fileInternal.write.bind(this._fileInternal), cb, offset, data);
  }

  del (offset: number, data: Buffer, cb?: Callback<void>): Promise<void> {
    return createPromise<void>(this._fileInternal.del.bind(this._fileInternal), cb, offset, data);
  }

  stat (cb?: Callback<FileStat>): Promise<FileStat> {
    return createPromise<FileStat>(this._fileInternal.stat.bind(this._fileInternal), cb);
  }

  close (cb?: Callback<void>): Promise<void> {
    return createPromise<void>(this._fileInternal.close.bind(this._fileInternal), cb);
  }

  destroy (cb?: Callback<void>): Promise<void> {
    return createPromise<void>(this._fileInternal.destroy.bind(this._fileInternal), cb);
  }
}

function createPromise<ReturnType> (callbackFunc: (...args: any[]) => void, cb?: Callback<ReturnType>, ...args: any[]): Promise<ReturnType> {
  const promise = new Promise<ReturnType>(
    (resolve, reject) => {
      callbackFunc(...args, (err: Error | null, data?: ReturnType) => {
        cb?.(err, data);
        if (err) {
          reject(err);
        } else {
          resolve(data!);
        }
      });
    });
  if (cb) {
    promise.catch((_) => {});
  }
  return promise;
}
