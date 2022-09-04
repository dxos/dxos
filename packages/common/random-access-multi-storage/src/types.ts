//
// Copyright 2022 DXOS.org
//

import { FileInternal } from './internal';

export interface FileStat {
  size: number
}

export interface Callback<DataType> {
  (err: Error | null, data?: DataType): void
}

export interface RandomAccessStorage {
  (file: string, opts?: {}): FileInternal

  root: string

  type: string

  destroy(): Promise<void>
}
