//
// Copyright 2022 DXOS.org
//

import { Callback, FileStat } from '../types';

/**
 * Interface of file objects returned by `random-access-*` implementations.
 */
export interface FileInternal {
  read(offset: number, size: number, cb?: Callback<Buffer>): void

  write(offset: number, data: Buffer, cb?: Callback<void>): void

  del(offset: number, size: number, cb?: Callback<void>): void

  stat(cb: Callback<FileStat>): void

  close(cb?: Callback<void>): void

  destroy(cb?: Callback<void>): void

  closed: boolean
  destroyed: boolean
}
