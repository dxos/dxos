//
// Copyright 2023 DXOS.org
//

import { toRange, type Range } from './random';

export const type = {
  boolean: (probability: number): boolean => Math.random() < probability,

  float: (range: Range = { min: 0, max: 1 }): number => {
    const { min, max } = toRange(range);
    return min + Math.random() * (max - min);
  },

  number: (range: Range = { min: 0, max: 10 }): number => {
    return Math.floor(type.float(range));
  },

  // TODO(burdon): Better to use date-fms.
  date: (range: Range = { min: Date.now(), max: Date.now() + 1 }): Date => {
    const { min, max } = toRange(range, Date.now());
    return new Date(min + Math.random() * (max - min));
  },
};
