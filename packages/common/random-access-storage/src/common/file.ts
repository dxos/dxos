//
// Copyright 2022 DXOS.org
//

import promisify from 'pify';

import { FileStat, RandomAccessFileImpl } from './random-access-file';

/**
 * Random access file wrapper.
 * https://github.com/random-access-storage/random-access-storage
 */
export class File {
  constructor (
    protected readonly _storage: RandomAccessFileImpl
  ) {}

  get storage () {
    return this._storage;
  }

  get filename () {
    return this._storage.filename;
  }

  async write (offset: number, data: Buffer) {
    return promisify(this._storage.write.bind(this._storage))(offset, data);
  }

  async read (offset: number, size: number): Promise<Buffer> {
    return promisify(this._storage.read.bind(this._storage))(offset, size);
  }

  /**
   * Truncate the file at offset if offset + length >= the current file length. Otherwise, do nothing.
   * Throws 'Not deletable' in IDb realization.
   *
   * Example:
   * // Truncate it at offset 1 with size 1.
   * await file.del(1, 1); // Do nothing, file will have content Buffer([a, c, d]).
   *
   * // Truncate it at offset 1 with size 2.
   * await file.del(1, 2); // Truncate, file will have content Buffer([a]) because 1 + 2 >= 3.
   */
  // TODO(burdon): Remove this comment after speaking with Mykola.
  async del (offset: number, size: number) {
    return promisify(this._storage.del.bind(this._storage))(offset, size);
  }

  async truncate (offset: number) {
    return promisify(this._storage.truncate.bind(this._storage))(offset);
  }

  async stat (): Promise<FileStat> {
    return promisify(this._storage.stat.bind(this._storage))();
  }

  async close (): Promise<Error> {
    return promisify(this._storage.close.bind(this._storage))();
  }

  async destroy (): Promise<Error> {
    return promisify(this._storage.destroy.bind(this._storage))();
  }

  /**
   * @internal
   */
  _isDestroyed () {
    return this._storage.destroyed;
  }

  /**
   * @internal
   * Only to be used in RamStorage and IDb implementation.
   * TODO(mykola): Don`t know if will work with others.
   */
  _reopen () {
    if (this._isDestroyed()) {
      throw new Error('File is destroyed.');
    }

    this._storage.closed = false;
  }
}
