//
// Copyright 2022 DXOS.org
//

import promisify from 'pify';

import { FileStat, RandomAccessFile } from './random-access-file';

/**
 * Random access file wrapper.
 */
export class File {
  constructor (protected readonly _file: RandomAccessFile) {}

  get filename () {
    return this._file.filename;
  }

  /**
   * Read Buffer from file starting from offset to offset+size.
   */
  read (offset: number, size: number): Promise<Buffer> {
    return promisify(this._file.read.bind(this._file))(offset, size) as Promise<Buffer>;
  }

  /**
   * Write Buffer into file starting from offset.
   */
  write (offset: number, data: Buffer): Promise<void> {
    return promisify(this._file.write.bind(this._file))(offset, data) as Promise<void>;
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
   * await file.del(1, 2); // Truncate, file will have content Buffer([a]) because 1 + 2 >= 3.
   */
  truncate (offset: number, size: number): Promise<void> {
    return promisify(this._file.del.bind(this._file))(offset, size) as Promise<void>;
  }

  stat (): Promise<FileStat> {
    return promisify(this._file.stat.bind(this._file))() as Promise<FileStat>;
  }

  close (): Promise<void> {
    return promisify(this._file.close.bind(this._file))() as Promise<void>;
  }

  /**
   * Delete the file.
   */
  delete (): Promise<void> {
    return promisify(this._file.destroy.bind(this._file))() as Promise<void>;
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
