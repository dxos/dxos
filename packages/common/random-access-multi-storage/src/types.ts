//
// Copyright 2022 DXOS.org
//

export interface FileStat {
  size: number
}

export interface Callback<DataType> {
  (err: Error | null, data?: DataType): void;
}
