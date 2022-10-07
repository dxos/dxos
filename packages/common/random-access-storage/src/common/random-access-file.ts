//
// Copyright 2022 DXOS.org
//

export type FileStat = {
  size: number
}

export type Callback<T> = (err: Error | null, result?: T) => void

/**
 * Interface of file objects returned by `random-access-*` implementations.
 * https://github.com/random-access-storage/random-access-file
 */
export interface RandomAccessFile {
  write (offset: number, data: Buffer, cb: Callback<any>): void
  read (offset: number, size: number, cb: Callback<Buffer>): void
  del (offset: number, size: number, cb: Callback<any>): void
  truncate (offset: number, cb: Callback<void>): void
  stat (cb: Callback<FileStat>): void
  close (cb: Callback<Error>): void
  destroy (cb: Callback<Error>): void
}

// TODO(burdon): Explain impl fields (are the common across all implementations)?
export interface RandomAccessFileImpl extends RandomAccessFile {
  closed: boolean
  destroyed: boolean
  filename: string
}

export type RandomAccessFileConstructor = (filename: string, opts?: {}) => RandomAccessFile
