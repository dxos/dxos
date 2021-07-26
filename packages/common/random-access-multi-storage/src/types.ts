//
// Copyright 2021 DXOS.org
//

import { StorageType } from './storage-types';

// export declare function createStorage(root: string, type?: StorageType): Storage;

export interface Storage {
  (file: string, opts?: {}): File;

  root: string;

  type: StorageType;

  destroy(): Promise<void>;
}

export interface File {
  read(offset: number, size: number, cb?: (err: Error | null, data?: Buffer) => void): void;

  write(offset: number, data: Buffer, cb?: (err: Error | null) => void): void;

  del(offset: number, data: Buffer, cb?: (err: Error | null) => void): void;

  stat(cb: (err: Error | null, data?: FileStat) => void): void;

  close(cb?: (err: Error | null) => void): void;

  destroy(cb?: (err: Error | null) => void): void
}

export interface FileStat {
  size: number
}
