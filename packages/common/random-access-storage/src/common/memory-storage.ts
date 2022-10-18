//
// Copyright 2021 DXOS.org
//

import { promisify } from "node:util";
import ram from "random-access-memory";
import { Callback, RandomAccessStorage } from "random-access-storage";

import { AbstractStorage } from "./abstract-storage";
import { File, wrapFile } from "./file";
import { StorageType } from "./storage";

class FileRAM implements File {
  constructor(readonly native: RandomAccessStorage) {}

  write = promisify(this.native.write.bind(this.native)) as any;
  read = promisify(this.native.read.bind(this.native)) as any;
  del = promisify(this.native.del.bind(this.native)) as any;
  stat = promisify(this.native.stat.bind(this.native)) as any;
  close = promisify(this.native.close.bind(this.native)) as any;
  destroy = promisify(this.native.destroy.bind(this.native)) as any;
}

/**
 * Storage interface implementation for RAM.
 * https://github.com/random-access-storage/random-access-memory
 */
export class MemoryStorage extends AbstractStorage {
  public override type: StorageType = StorageType.RAM;

  protected override _createFile(
    path: string,
    filename: string
  ): FileRAM {
    return this._castReadToBuffer(ram());
  }

  protected override _openFile(file: File): FileRAM {
    const native = file.native;
    (native as any).closed = false;
    return this._castReadToBuffer(native);
  }

  private _castReadToBuffer(file: RandomAccessStorage): FileRAM {
    // Hack to make return type consistent on all platforms
    const trueRead = file.read.bind(file);
    file.read = (offset: number, size: number, cb: Callback<Buffer>) =>
      trueRead(offset, size, (error: Error | null, data?: Buffer) => {
        if (error) {
          return cb(error);
        } else {
          return cb(error, Buffer.from(data!));
        }
      });
    return new FileRAM(file);
  }
}
