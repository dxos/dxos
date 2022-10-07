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
    protected readonly _file: RandomAccessFileImpl
  ) {}

  get file () {
    return this._file;
  }

  get filename () {
    return this._file.filename;
  }

  async write (offset: number, data: Buffer) {
    return promisify(this._file.write.bind(this._file))(offset, data);
  }

  async read (offset: number, size: number): Promise<Buffer> {
    return promisify(this._file.read.bind(this._file))(offset, size);
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
    return promisify(this._file.del.bind(this._file))(offset, size);
  }

  async truncate (offset: number) {
    return promisify(this._file.truncate.bind(this._file))(offset);
  }

  async stat (): Promise<FileStat> {
    return promisify(this._file.stat.bind(this._file))();
  }

  async close (): Promise<Error> {
    return promisify(this._file.close.bind(this._file))();
  }

  async destroy (): Promise<Error> {
    return promisify(this._file.destroy.bind(this._file))();
  }

  /**
   * @internal
   */
  _isDestroyed () {
    return this._file.destroyed;
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

    this._file.closed = false;
  }
}
