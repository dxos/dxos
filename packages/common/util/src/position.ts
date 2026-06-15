//
// Copyright 2025 DXOS.org
//

// TODO(burdon): This shouldn't be in this low-level util? Move to app-framework?

/**
 * Determines priority order:
 * - `undefined` - Remain in natural order.
 * - `first` - Placed before items in natural order.
 * - `last` - Placed after items in natural order.
 */
export type Position = 'first' | 'last';

/**
 * Sorting function for sorting by position.
 */
export const byPosition = <T extends { position?: Position }>({ position: a }: T, { position: b }: T) => {
  if (a === b) {
    return 0;
  } else if (a === 'first' || b === 'last') {
    return -1;
  } else if (b === 'first' || a === 'last') {
    return 1;
  } else {
    return 0;
  }
};
