//
// Copyright 2022 DXOS.org
//
import { FileInternal } from '../internal';
import { Callback, FileStat } from '../types';

/**
 * Wrapper class that implements the promises API for the File callbacks API
 */
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

  /**
   * Reads Buffer from file starting from offset to offset+size.
   */
  read (offset: number, size: number, cb?: Callback<Buffer>): Promise<Buffer> {
    return createPromise<Buffer>(this._fileInternal.read.bind(this._fileInternal), cb, offset, size);
  }

  /**
   * Writes Buffer into file starting from offset.
   */
  write (offset: number, data: Buffer, cb?: Callback<void>): Promise<void> {
    return createPromise<void>(this._fileInternal.write.bind(this._fileInternal), cb, offset, data);
  }

  /**
   * Will truncate the file if offset + data.length is larger than the current file length. Is otherwise a noop.
   */
  del (offset: number, data: Buffer, cb?: Callback<void>): Promise<void> {
    return createPromise<void>(this._fileInternal.del.bind(this._fileInternal), cb, offset, data);
  }

  stat (cb?: Callback<FileStat>): Promise<FileStat> {
    return createPromise<FileStat>(this._fileInternal.stat.bind(this._fileInternal), cb);
  }

  close (cb?: Callback<void>): Promise<void> {
    return createPromise<void>(this._fileInternal.close.bind(this._fileInternal), cb);
  }

  /**
   * Completly delete file.
   */
  destroy (cb?: Callback<void>): Promise<void> {
    return createPromise<void>(this._fileInternal.destroy.bind(this._fileInternal), cb);
  }
}

const createPromise = <ReturnType>(callbackFunc: (...args: any[]) => void, cb?: Callback<ReturnType>, ...args: any[]): Promise<ReturnType> => {
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
};
