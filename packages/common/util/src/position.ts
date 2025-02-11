//
// Copyright 2025 DXOS.org
//

/**
 * Determines priority order.
 *
 * - `static` - Remain in natural order.
 * - `hoist` - Placed before `static`.
 * - `fallback` - Placed after `static`.
 */
export type Position = 'static' | 'hoist' | 'fallback';

/**
 * Sorting function for sorting by position.
 */
export const byPosition = <T extends { position?: Position }>(a: T, b: T) => {
  const aPosition = a.position ?? 'static';
  const bPosition = b.position ?? 'static';

  if (aPosition === bPosition) {
    return 0;
  } else if (aPosition === 'hoist' || bPosition === 'fallback') {
    return -1;
  } else if (bPosition === 'hoist' || aPosition === 'fallback') {
    return 1;
  }

  return 0;
};
