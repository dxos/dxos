//
// Copyright 2022 DXOS.org
//
import { FileInternal } from '../internal';
import { Callback, FileStat } from '../types';

/**
 * Handle to the file allowing read/write access to the data in the file.
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
   * Truncate the file at offset if offset + length >= the current file length. Otherwise, do nothing.
   * Throws 'Not deletable' in IDb realization.
   * 
   * Example:
   * // There is file with content Buffer([a, b, c]) at 0 offset.
   * 
   * // Truncate it at offset 1 with size 1.
   * await file.del(1, 1); // Do nothing, file will have content Buffer([a, c, d]).
   * 
   * // Truncate it at offset 1 with size 2.
   * await file.del(1, 2); // Truncates, file will have content Buffer([a]) because 1 + 2 >= 3.
   */
  del (offset: number, size: number, cb?: Callback<void>): Promise<void> {
    return createPromise<void>(this._fileInternal.del.bind(this._fileInternal), cb, offset, size);
  }

  stat (cb?: Callback<FileStat>): Promise<FileStat> {
    return createPromise<FileStat>(this._fileInternal.stat.bind(this._fileInternal), cb);
  }

  close (cb?: Callback<void>): Promise<void> {
    return createPromise<void>(this._fileInternal.close.bind(this._fileInternal), cb);
  }

  /**
   * Delete the file.
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
