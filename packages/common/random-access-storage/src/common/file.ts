//
// Copyright 2022 DXOS.org
//

import pify from 'pify';

import type { FileStat, RandomAccessFile } from '../types';

/**
 * Random access file wrapper.
 * https://github.com/random-access-storage/random-access-storage
 */
export interface File {
  readonly filename: string
  readonly native: RandomAccessFile

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

/**
 * Construct async File wrapper.
 */
export const wrapFile = (file: RandomAccessFile): File => {
  const wrapper = pify(file);
  return Object.assign(wrapper, {
    native: file,

    // TODO(burdon): This will only work for ram and idb.
    reopen: () => {
      if (wrapper.destroyed) {
        throw new Error('File is destroyed.');
      }

      wrapper.closed = false;
    }
  });
};
