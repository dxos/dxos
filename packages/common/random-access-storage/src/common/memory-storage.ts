//
// Copyright 2021 DXOS.org
//

import ram from 'random-access-memory';
import { Callback, RandomAccessStorage } from 'random-access-storage';

import { AbstractStorage } from './abstract-storage';
import { File, FileWrap } from './file';
import { StorageType } from './storage';

/**
 * Storage interface implementation for RAM.
 * https://github.com/random-access-storage/random-access-memory
 */
export class MemoryStorage extends AbstractStorage {
  public override type: StorageType = StorageType.RAM;

  protected override _createFile (
    path: string,
    filename: string
  ): FileWrap {
    return this._castReadToBuffer(ram());
  }

  protected override _openFile (file: File): FileWrap {
    const native = file.native;
    (native as any).closed = false;
    return this._castReadToBuffer(native);
  }

  private _castReadToBuffer (native: RandomAccessStorage): FileWrap {
    // Hack to make return type consistent on all platforms
    const trueRead = native.read.bind(native);
    native.read = (offset: number, size: number, cb: Callback<Buffer>) =>
      trueRead(offset, size, (error: Error | null, data?: Buffer) => {
        if (error) {
          return cb(error);
        } else {
          return cb(error, Buffer.from(data!));
        }
      });
    return new FileWrap(native);
  }
}
