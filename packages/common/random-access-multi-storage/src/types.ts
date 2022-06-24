export interface FileStat {
  size: number
}

export interface Callback<DataType> {
  (err: Error | null, data?: DataType): void;
}