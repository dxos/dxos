//
// Copyright 2021 DXOS.org
//

import { Callback } from './callback';
import { RandomAccessStorage } from './random-access-storage';

export type FileStat = {
  size: number
}

/**
 * https://www.npmjs.com/package/random-access-file
 * https://github.com/random-access-storage/random-access-file
 */
export interface RandomAccessFile extends RandomAccessStorage {
  filename: string

  write (offset: number, data: Buffer, cb: Callback<any>): void
  read (offset: number, size: number, cb: Callback<Buffer>): void
  del (offset: number, size: number, cb: Callback<any>): void
  truncate (offset: number, cb: Callback<void>): void
  stat (cb: Callback<FileStat>): void
  close (cb: Callback<Error>): void
  destroy (cb: Callback<Error>): void
}

export type RandomAccessFileConstructor = (filename: string, options?: any) => RandomAccessFile
