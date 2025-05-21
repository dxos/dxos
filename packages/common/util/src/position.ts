//
// Copyright 2025 DXOS.org
//

// TODO(burdon): This shouldn't be in this low-level util? Move to app-framework?

/**
 * Determines priority order:
 * - `static` - Remain in natural order.
 * - `hoist` - Placed before `static`.
 * - `fallback` - Placed after `static`.
 */
// TODO(wittjosiah): Change to 'static' | 'start' | 'end'.
export type Position = 'static' | 'hoist' | 'fallback';

/**
 * Sorting function for sorting by position.
 */
export const byPosition = <T extends { position?: Position }>(
  { position: a = 'static' }: T,
  { position: b = 'static' }: T,
) => {
  if (a === b) {
    return 0;
  } else if (a === 'hoist' || b === 'fallback') {
    return -1;
  } else if (b === 'hoist' || a === 'fallback') {
    return 1;
  } else {
    return 0;
  }
};
