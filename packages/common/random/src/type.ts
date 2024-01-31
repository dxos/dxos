//
// Copyright 2023 DXOS.org
//

import { core, generate, type Range, toRange } from './core';

export const type = {
  boolean: (probability = 0.5): boolean => core.random < probability,

  float: (range: Range = { min: 0, max: 1 }): number => {
    return generate(range, (range) => core.random * (range.max - range.min) + range.min);
  },

  number: (range: Range = { min: 0, max: 10 }): number => {
    return generate(range, (range) => Math.floor(core.random * (range.max - range.min) + range.min));
  },

  // TODO(burdon): Better to use date-fms.
  date: (range: Range = { min: Date.now(), max: Date.now() + 1 }): Date => {
    const { min, max } = toRange(range, Date.now());
    return new Date(min + core.random * (max - min));
  },
};
