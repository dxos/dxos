//
// Copyright 2022 DXOS.org
//

import pify from 'pify';
import type { FileStat, RandomAccessFile } from 'random-access-file';

/**
 * Construct async File wrapper.
 */
export const createFile = (file: RandomAccessFile): File => {
  const wrapper = pify(file);
  return Object.assign(wrapper, {
    // TODO(burdon): This will only work for ram and idb.
    reopen: () => {
      if (wrapper.destroyed) {
        throw new Error('File is destroyed.');
      }

      wrapper.closed = false;
    }
  });
};

/**
 * Random access file wrapper.
 * https://github.com/random-access-storage/random-access-storage
 */
export interface File {
  filename: string

  write (offset: number, data: Buffer): Promise<void>
  read (offset: number, size: number): Promise<Buffer>
  del (offset: number, size: number): Promise<void>
  truncate (offset: number): Promise<void>
  stat (): Promise<FileStat>
  close (): Promise<Error>
  destroy (): Promise<Error>

  /**
   * @deprecated
   */
  // TODO(burdon): Remove.
  get destroyed (): boolean

  /**
   * @deprecated
   */
  // TODO(burdon): Remove.
  reopen (): void
}
