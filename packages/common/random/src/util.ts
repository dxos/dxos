//
// Copyright 2023 DXOS.org
//

import { randNumber } from '@ngneat/falso';

export type Range = { min?: number; max?: number; count?: number };

export const toRange = (range: number | Range, min = 0) => (typeof range === 'number' ? { min, max: range } : range);

export const getCount = (range?: number | Range) => (typeof range === 'number' ? range : randNumber(range));

export const multiple = <T>(fn: (i: number) => T, n: number): T[] => Array.from({ length: n }).map((_, i) => fn(i));

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
    // TODO(burdon): Set timeout.
    while (results.size < n) {
      results.add(values());
    }

    return Array.from(results);
  }
};
