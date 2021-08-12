//
// Copyright 2021 DXOS.org
//

export interface FileStat {
  size: number
}

export interface IFile {
  read(offset: number, size: number, cb?: (err: Error | null, data?: Buffer) => void): void;

  write(offset: number, data: Buffer, cb?: (err: Error | null) => void): void;

  del(offset: number, data: Buffer, cb?: (err: Error | null) => void): void;

  stat(cb: (err: Error | null, data?: FileStat) => void): void;

  close(cb?: (err: Error | null) => void): void;

  destroy(cb?: (err: Error | null) => void): void
}
