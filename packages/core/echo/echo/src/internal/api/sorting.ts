//
// Copyright 2025 DXOS.org
//

import { getTypename } from '../annotations';
import type { AnyEntity } from '../types';

import { getLabel } from './annotations';

/**
 * String comparison helper for sorting.
 */
export const compare = (a?: string, b?: string): number => {
  if (a == null) {
    return b == null ? 0 : 1;
  }
  if (b == null) {
    return -1;
  }
  return a.localeCompare(b);
};

/**
 * Comparator function type for sorting entities.
 * Accepts both reactive entities and snapshots.
 */
export type Comparator<T extends AnyEntity = AnyEntity> = (a: T, b: T) => number;

/**
 * Sort entities by label.
 */
export const sortByLabel: Comparator = (a: AnyEntity, b: AnyEntity) => compare(getLabel(a), getLabel(b));

/**
 * Sort entities by typename.
 */
export const sortByTypename: Comparator = (a: AnyEntity, b: AnyEntity) => compare(getTypename(a), getTypename(b));

/**
 * Compose multiple comparators into one.
 * Applies comparators in order until one returns non-zero.
 */
export const sort = <T extends AnyEntity>(...comparators: Comparator<T>[]): Comparator<T> => {
  return (a: T, b: T) => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  };
};
