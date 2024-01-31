//
// Copyright 2023 DXOS.org
//

import { random } from '../core';
import { generate, type Range } from '../util';

type ArrayGenerator<T> = (i: number) => T;

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

export const type = {
  /**
   * Generate an array passing the current index position to the generator.
   */
  array,

  boolean: (probability = 0.5): boolean => random() < probability,

  float: (range: Range = { min: 0, max: 1 }): number => {
    return generate(range, (range) => random() * (range.max - range.min) + range.min);
  },

  integer: (range: Range = { min: 0, max: 10 }): number => {
    return generate(range, (range) => Math.floor(random() * (range.max - range.min) + range.min));
  },
};
