//
// Copyright 2022 DXOS.org
//

declare module 'random-access-file';
declare module 'random-access-idb';
declare module 'random-access-memory';
declare module 'random-access-web/mutable-file-wrapper';

/**
 * Interface for `random-access-*` implementations.
 *
 * https://www.npmjs.com/package/random-access-storage
 * https://github.com/random-access-storage/random-access-storage
 */
declare module 'random-access-storage' {
  import type { EventEmitter } from 'events';

  export type Callback<T> = (err: Error | null, result?: T) => void

  export interface RandomAccessStorageProperties extends EventEmitter {
    readonly opened: boolean
    readonly suspended: boolean
    readonly closed: boolean
    readonly unlinked: boolean
    readonly writing: boolean

    readonly readable: boolean
    readonly writable: boolean
    readonly deletable: boolean
    readonly truncatable: boolean
    readonly statable: boolean
  }

  export type FileStat = {
    size: number
  }

  export interface RandomAccessStorage extends RandomAccessStorageProperties {
    write (offset: number, data: Buffer, cb?: Callback<any>): void
    read (offset: number, size: number, cb: Callback<Buffer>): void
    del (offset: number, size: number, cb: Callback<any>): void
    stat (cb: Callback<FileStat>): void
    close (cb: Callback<Error>): void
    destroy (cb: Callback<Error>): void
    truncate? (offset: number, cb: Callback<void>): void
    clone? (): this
  }

  export type RandomAccessStorageConstructor = (filename: string, options?: any) => RandomAccessStorage
}
