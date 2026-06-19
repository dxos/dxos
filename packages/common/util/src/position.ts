//
// Copyright 2025 DXOS.org
//

// TODO(burdon): This shouldn't be in this low-level util? Move to app-framework?

/**
 * Numeric priority order — lower values sort earlier.
 * - `undefined` - Treated as `0`; sorts between `first` and `last`.
 * - `Position.first` (-Infinity) - Sorts before all other items.
 * - `Position.last` (Infinity) - Sorts after all other items.
 * - Any integer between `first` and `last` allows custom tiers.
 */
export type Position = number;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Position {
  export const first: Position = -Infinity;
  export const last: Position = Infinity;
}

/**
 * Sorting function for sorting by position.
 */
export const byPosition = <T extends { position?: Position }>({ position: a }: T, { position: b }: T): -1 | 0 | 1 => {
  const aVal = a ?? 0;
  const bVal = b ?? 0;
  if (aVal === bVal) {
    return 0;
  }
  return aVal < bVal ? -1 : 1;
};
