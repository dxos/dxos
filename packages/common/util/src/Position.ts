//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

/**
 * Numeric priority order — lower values sort earlier.
 * - `undefined` - Treated as `0`; sorts between `first` and `last`.
 * - `first` (-Infinity) - Sorts before all other items.
 * - `last` (Infinity) - Sorts after all other items.
 * - Any integer between `first` and `last` allows custom tiers.
 */
export type Position = number;

export const first: Position = -Infinity;
export const last: Position = Infinity;

/**
 * Comparator for sorting by position.
 */
export const compare = <T extends { position?: Position }>({ position: a }: T, { position: b }: T): -1 | 0 | 1 => {
  const aVal = a ?? 0;
  const bVal = b ?? 0;
  if (aVal === bVal) {
    return 0;
  }
  return aVal < bVal ? -1 : 1;
};
