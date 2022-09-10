//
// Copyright 2022 DXOS.org
//

export interface FileStat {
  size: number
}

export interface Callback<DataType> {
  (err: Error | null, data?: DataType): void
}

/**
 * Interface of file objects returned by `random-access-*` implementations.
 * https://github.com/random-access-storage/random-access-file
 */
export interface RandomAccessFile {
  read (offset: number, size: number, cb?: Callback<Buffer>): void
  write (offset: number, data: Buffer, cb?: Callback<void>): void
  del (offset: number, size: number, cb?: Callback<void>): void
  stat (cb: Callback<FileStat>): void
  close (cb?: Callback<void>): void
  destroy (cb?: Callback<void>): void

  filename: string
  closed: boolean
  destroyed: boolean
}

export type RandomAccessFileConstructor = (filename: string, opts?: {}) => RandomAccessFile
