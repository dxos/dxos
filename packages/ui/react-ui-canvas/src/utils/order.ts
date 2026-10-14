//
// Copyright 2026 DXOS.org
//

//
// Fractional z-order keys: strings that sort lexicographically, with a key constructible between any
// two, so a reorder touches one element instead of renumbering the scene (which would be a conflict
// magnet once elements live in a CRDT map).
//

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export type Ordered = { id: string; z: string };

/**
 * A key strictly between `a` and `b` (each a base-62 fraction in (0, 1) without trailing zeros);
 * `undefined` stands for the open end on that side.
 */
export const between = (a?: string, b?: string): string => midpoint(a ?? '', b);

const midpoint = (a: string, b: string | undefined): string => {
  if (b !== undefined && a >= b) {
    throw new Error(`order: ${JSON.stringify(a)} >= ${JSON.stringify(b)}`);
  }
  if (a.endsWith('0') || b?.endsWith('0')) {
    throw new Error('order: trailing zero');
  }
  if (b !== undefined) {
    let prefix = 0;
    while (prefix < b.length && (a[prefix] ?? '0') === b[prefix]) {
      prefix++;
    }
    if (prefix > 0) {
      return b.slice(0, prefix) + midpoint(a.slice(prefix), b.slice(prefix));
    }
  }
  const digitA = a ? DIGITS.indexOf(a[0]) : 0;
  const digitB = b !== undefined ? DIGITS.indexOf(b[0]) : DIGITS.length;
  if (digitB - digitA > 1) {
    return DIGITS[Math.round((digitA + digitB) / 2)];
  }
  if (b !== undefined && b.length > 1) {
    return b[0];
  }
  return DIGITS[digitA] + midpoint(a.slice(1), undefined);
};

/** Elements in paint order (bottom first). */
export const sortByZ = <T extends Ordered>(elements: readonly T[]): T[] =>
  [...elements].sort((left, right) => (left.z < right.z ? -1 : left.z > right.z ? 1 : left.id < right.id ? -1 : 1));

/** A key above every element, so a new one paints on top. */
export const topZ = (elements: readonly Ordered[]): string => {
  let max: string | undefined;
  for (const element of elements) {
    if (max === undefined || element.z > max) {
      max = element.z;
    }
  }
  return between(max, undefined);
};

/** Keys for `count` elements in paint order, evenly spread from the open bottom. */
export const initialKeys = (count: number): string[] => {
  const keys: string[] = [];
  let previous: string | undefined;
  for (let index = 0; index < count; index++) {
    previous = between(previous, undefined);
    keys.push(previous);
  }
  return keys;
};
