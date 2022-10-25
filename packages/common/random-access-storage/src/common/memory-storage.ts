//
// Copyright 2021 DXOS.org
//

import ram from 'random-access-memory';
import { Callback, RandomAccessStorage } from 'random-access-storage';

import { AbstractStorage } from './abstract-storage';
import { StorageType } from './storage';

/**
 * Storage interface implementation for RAM.
 * https://github.com/random-access-storage/random-access-memory
 */
export class MemoryStorage extends AbstractStorage {
  public override type: StorageType = StorageType.RAM;

  protected override _createFile(
    path: string,
    filename: string
  ): RandomAccessStorage {
    return this._patchFile(ram());
  }

  protected override _openFile(file: RandomAccessStorage): RandomAccessStorage {
    const newFile = file.clone!();
    (newFile as any).closed = false;
    return this._patchFile(newFile);
  }

  private _patchFile(file: RandomAccessStorage): RandomAccessStorage {
    // Patch required to make consistent across platforms.
    const trueRead = file.read.bind(file);

    file.read = (offset: number, size: number, cb: Callback<Buffer>) =>
      trueRead(offset, size, (err: Error | null, data?: Buffer) => {
        if (err) {
          return cb(err);
        } else {
          return cb(err, Buffer.from(data!));
        }
      });

    return file;
  }
}
