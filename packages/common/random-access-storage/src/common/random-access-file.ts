//
// Copyright 2022 DXOS.org
//

export type FileStat = {
  size: number
}

export type Callback<DataType> = (err: Error | null, data?: DataType) => void

/**
 * Interface of file objects returned by `random-access-*` implementations.
 * https://github.com/random-access-storage/random-access-file
 */
export interface RandomAccessFile {
  closed: boolean
  destroyed: boolean
  filename: string

  close (cb?: Callback<void>): void
  del (offset: number, size: number, cb?: Callback<void>): void
  destroy (cb?: Callback<void>): void
  read (offset: number, size: number, cb?: Callback<Buffer>): void
  stat (cb: Callback<FileStat>): void
  write (offset: number, data: Buffer, cb?: Callback<void>): void
}

export type RandomAccessFileConstructor = (filename: string, opts?: {}) => RandomAccessFile
