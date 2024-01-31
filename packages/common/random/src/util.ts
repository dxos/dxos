//
// Copyright 2023 DXOS.org
//

type ArrayGenerator<T> = (i: number) => T;

export type Options = number | Range;

export type Range = { min: number; max: number };

export const toRange = (range: Options, min = 0) => (typeof range === 'number' ? { min, max: range } : range);

export const array: {
  (length: number): any[];
  <T>(length: number, generator?: ArrayGenerator<T>): T[];
} = <T>(length: number, generator?: ArrayGenerator<T>) => {
  const array: T[] = Array.from({ length });
  if (generator) {
    return array.map((_, i) => generator(i));
  }

  return array;
};

export const generate = <T>(range: Range, f: (range: Range) => T): T => {
  return f(toRange(range));
};

// Similar to faker.helpers.
export const util = {
  /**
   * Generate an array passing the current index position to the generator.
   */
  array,

  /**
   * Generate an array calling the generator without a value.
   */
  multiple: <T>(n: number, f: () => T): T[] => {
    return array(n).map(() => f());
  },

  /**
   * Returns single element.
   */
  arrayElement: <T>(values: T[]): T => {
    return values[Math.floor(Math.random() * values.length)];
  },

  /**
   * Returns unique set of values.
   */
  uniqueArray: <T>(values: T[], n: number): T[] => {
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
