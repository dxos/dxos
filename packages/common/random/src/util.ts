//
// Copyright 2023 DXOS.org
//

export type Options = number | Range;

export type Range = { min: number; max: number };

export const toRange = (range: Options, min = 0) => (typeof range === 'number' ? { min, max: range } : range);

export const generate = <T>(range: Range, f: (range: Range) => T): T => {
  return f(toRange(range));
};

export const uniqueArray = <T>(values: T[] | (() => T), n: number): T[] => {
  if (Array.isArray(values)) {
    const results: T[] = [];
    const selection = Array.from(new Set<T>(values));
    for (let i = 0; i < n; i++) {
      if (selection.length === 0) {
        break;
      }
      results.push(selection.splice(Math.floor(Math.random() * selection.length), 1)[0]);
    }
    return results;
  } else {
    const results = new Set<T>();
    while (results.size < n) {
      results.add(values());
    }

    return Array.from(results);
  }
};

// Similar to faker.helpers.
export const util = {
  /**
   * Generate an array calling the generator without a value.
   */
  multiple: <T>(n: number, f: () => T): T[] => {
    return Array.from({ length: n }).map(() => f());
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
