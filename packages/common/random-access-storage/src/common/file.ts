//
// Copyright 2022 DXOS.org
//

import type {
  FileStat,
  RandomAccessStorage
} from 'random-access-storage';
import { promisify } from 'util';

/**
 * Random access file wrapper.
 * https://github.com/random-access-storage/random-access-storage
 */
export interface File {
  readonly native: RandomAccessStorage

  write(offset: number, data: Buffer): Promise<void>
  read(offset: number, size: number): Promise<Buffer>
  del(offset: number, size: number): Promise<void>
  stat(): Promise<FileStat>
  close(): Promise<Error>
  destroy(): Promise<Error>

  // Not supported in node, memory.
  truncate? (offset: number): Promise<void>
}

export class FileWrap implements File {
  constructor (readonly native: RandomAccessStorage) { }

  write = promisifyField(this.native, 'write') as any;
  read = promisifyField(this.native, 'read') as any;
  del = promisifyField(this.native, 'del') as any;
  stat = promisifyField(this.native, 'stat') as any;
  close = promisifyField(this.native, 'close') as any;
  destroy = promisifyField(this.native, 'destroy') as any;
  truncate = promisifyField(this.native, 'truncate') as any;
}

const promisifyField = (object: any, fieldName: string) => {
  if (object[fieldName]) {
    return promisify(object[fieldName].bind(object));
  }
};
