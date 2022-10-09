//
// Copyright 2021 DXOS.org
//

declare module 'random-access-idb';
declare module 'random-access-memory';
declare module 'random-access-web/mutable-file-wrapper';

/**
 * https://www.npmjs.com/package/random-access-file
 * https://github.com/random-access-storage/random-access-file
 */
declare module 'random-access-file' {
  import { RandomAccessStorage } from 'random-access-storage';

  import { Callback } from './callback';

  export type FileStat = {
    size: number
  }

  export class RandomAccessFile extends RandomAccessStorage {
    filename: string;

    constructor (filename: string, options: any);

    write (offset: number, data: Buffer, cb: Callback<any>): void
    read (offset: number, size: number, cb: Callback<Buffer>): void
    del (offset: number, size: number, cb: Callback<any>): void
    truncate (offset: number, cb: Callback<void>): void
    stat (cb: Callback<FileStat>): void
    close (cb: Callback<Error>): void
    destroy (cb: Callback<Error>): void
  }

  export type Constructor = (filename: string, options: any) => RandomAccessFile

  // Default constructor.
  const raf: Constructor;

  export = raf;
}
