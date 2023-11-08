//
// Copyright 2020 DXOS.org
//

import { type ItemID } from '@dxos/protocols';

import { type Item } from './item';

export type OneOrMultiple<T> = T | T[];

export const dedupe = <T>(values: T[]) => Array.from(new Set(values));

export const coerceToId = (item: Item | ItemID): ItemID => {
  if (typeof item === 'string') {
    return item;
  }

  return item.id;
};

export const testOneOrMultiple = <T>(expected: OneOrMultiple<T>, value: T) => {
  if (Array.isArray(expected)) {
    return expected.includes(value);
  } else {
    return expected === value;
  }
};
