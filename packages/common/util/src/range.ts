//
// Copyright 2020 DXOS.org
//

export const range: {
  (n: number): number[];
  <T>(n: number, mapper: RangeMapper<T>): T[];
} = <T>(n: number = 0, mapper?: RangeMapper<T>) => {
  const range = Array.from(Array(n).keys());
  return mapper == null ? range : range.map(mapper);
};

export const rangeFromTo: {
  (from: number, to: number): number[];
  <T>(from: number, to: number, mapper: RangeMapper<T>): T[];
} = <T = number>(from: number, to: number, mapper?: RangeMapper<T>) =>
  mapper == null ? range(to - from, (i) => i + from) : range(to - from, (i) => mapper(i + from));

type RangeMapper<T> = (n: number) => T;

/**
 * Clamps a value between a minimum and maximum value.
 */
export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
