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
export type Disposition = 'static' | 'hoist' | 'fallback';

/**
 * Sorting function for sorting by disposition.
 */
export const byDisposition = <T extends { disposition?: Disposition }>(a: T, b: T) => {
  const aDisposition = a.disposition ?? 'static';
  const bDisposition = b.disposition ?? 'static';

  if (aDisposition === bDisposition) {
    return 0;
  } else if (aDisposition === 'hoist' || bDisposition === 'fallback') {
    return -1;
  } else if (bDisposition === 'hoist' || aDisposition === 'fallback') {
    return 1;
  }

  return 0;
};
