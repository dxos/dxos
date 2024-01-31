//
// Copyright 2023 DXOS.org
//

import seedrandom from 'seedrandom';

export type Options = number | Range;
export type Range = { min: number; max: number };

export const toRange = (range: Options, min = 0) => (typeof range === 'number' ? { min, max: range } : range);

let rand = seedrandom();

export const generate = <T>(range: Range, f: (range: Range) => T): T => {
  return f(toRange(range));
};

type ArrayGenerator<T> = (i: number) => T;

const array: {
  (length: number): any[];
  <T>(length: number, generator?: ArrayGenerator<T>): T[];
} = <T>(length: number, generator?: ArrayGenerator<T>) => {
  const array: T[] = Array.from({ length });
  if (generator) {
    return array.map((_, i) => generator(i));
  }

  return array;
};

export const core = {
  get random(): number {
    return rand();
  },

  seed: (seed: string) => {
    rand = seedrandom(seed);
  },

  /**
   * Generate an array passing the current index position to the generator.
   */
  array,

  /**
   * Generate an array calling the generator without a value.
   */
  multiple: (n: number, f: () => any) => {
    return core.array(n).map(() => f());
  },

  /**
   * Returns single element.
   */
  element: (values: any[]) => {
    return values[Math.floor(Math.random() * values.length)];
  },

  /**
   * Returns unique set of values.
   */
  unique: <T>(values: T[], n: number): T[] => {
    const selection = Array.from(new Set<T>(values));
    const results: T[] = [];
    for (let i = 0; i < n; i++) {
      if (selection.length === 0) {
        break;
      }
      results.push(selection.splice(Math.floor(Math.random() * selection.length), 1)[0]);
    }
    return results;
  },
};
