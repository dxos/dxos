//
// Copyright 2023 DXOS.org
//

import seedrandom from 'seedrandom';

export type Options = number | Range;
export type Range = { min: number; max: number; count?: number };

export const toRange = (range: Options, min = 0) => (typeof range === 'number' ? { min, max: range } : range);

let rand = seedrandom();

/**
 * Simple random generator that avoids dependency on faker.
 */
export const random = {
  get random() {
    return rand();
  },

  seed: (seed: string) => {
    rand = seedrandom(seed);
  },

  generator: <T>(range: Range, f: (range: Range) => T): T => {
    return f(toRange(rand, range));
  },

  // array: (size: number) => {
  //   return Array.from({ length: size });
  // },
  //
  // element: (values: any[]) => {
  //   return values[Math.floor(Math.random() * values.length)];
  // },
  //
  // unique: (values: any[], n: number) => {
  //   const results = new Set();
  // },
};
