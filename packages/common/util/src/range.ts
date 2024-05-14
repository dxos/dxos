//
// Copyright 2020 DXOS.org
//

export const range: {
  (n: number): number[];
  <T>(n: number, mapper: RangeMapper<T>): T[];
} = <T>(n: number, mapper?: RangeMapper<T>) => {
  const range = Array.from(Array(n).keys());
  return mapper == null ? range : range.map(mapper);
};

export const rangeFromTo: {
  (from: number, to: number): number[];
  <T>(from: number, to: number, mapper: RangeMapper<T>): T[];
} = <T = number>(from: number, to: number, mapper?: RangeMapper<T>) => {
  return mapper == null ? range(to - from, (i) => i + from) : range(to - from, (i) => mapper(i + from));
};

type RangeMapper<T> = (n: number) => T;
