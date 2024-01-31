//
// Copyright 2023 DXOS.org
//

import { random } from '../core';
import { generate, type Range, toRange } from '../util';

export const type = {
  boolean: (probability = 0.5): boolean => random() < probability,

  float: (range: Range = { min: 0, max: 1 }): number => {
    return generate(range, (range) => random() * (range.max - range.min) + range.min);
  },

  integer: (range: Range = { min: 0, max: 10 }): number => {
    return generate(range, (range) => Math.floor(random() * (range.max - range.min) + range.min));
  },

  // TODO(burdon): Better to use date-fms.
  date: (range: Range = { min: Date.now() - 24 * 3600 * 1000, max: Date.now() }): Date => {
    const { min, max } = toRange(range, Date.now());
    return new Date(min + random() * (max - min));
  },
};
