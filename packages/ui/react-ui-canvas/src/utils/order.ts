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

/** An element as an order read: one written without a key sorts at the bottom. */
export type MaybeOrdered = { id: string; z?: string };

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

/**
 * Elements in paint order (bottom first). One written without a key sorts at the bottom, as it draws first: every
 * reader of the order — the layer's paint, the hit test, a restack — must agree, or a click lands on something other
 * than what it hit.
 */
export const sortByZ = <T extends MaybeOrdered>(elements: readonly T[]): T[] =>
  [...elements].sort((left, right) => {
    const a = left.z ?? '';
    const b = right.z ?? '';
    return a < b ? -1 : a > b ? 1 : left.id < right.id ? -1 : 1;
  });

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

/**
 * A key above every element of a view, nodes and links alike: one order paints them, so a new element of either kind
 * goes above both.
 */
export const topOfView = (view: {
  nodes: Readonly<Record<string, Ordered>>;
  links: Readonly<Record<string, Ordered>>;
}): string => topZ([...Object.values(view.nodes), ...Object.values(view.links)]);

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

/**
 * The keys that lift `ids` above every other element of their group, or drop them below it, keeping their order among
 * themselves; only the moved elements are keyed, so a reorder writes as little as possible. Empty when they are already
 * there, or when there is nothing to move past. A group whose edge cannot be split — an element written with no key,
 * or a stored key no key fits past (one with a trailing zero) — is renumbered whole instead.
 */
export const orderToEnd = (
  elements: readonly MaybeOrdered[],
  ids: Iterable<string>,
  place: 'front' | 'back',
): Record<string, string> => {
  const moved = new Set(ids);
  const keyed: Ordered[] = elements.map(({ id, z }) => ({ id, z: z ?? '' }));
  const moving = sortByZ(keyed.filter((element) => moved.has(element.id)));
  const rest = sortByZ(keyed.filter((element) => !moved.has(element.id)));
  if (moving.length === 0 || rest.length === 0) {
    return {};
  }
  // Already there: the moving elements are the group's top (or bottom) run.
  const ordered = sortByZ(keyed);
  const run = place === 'front' ? ordered.slice(-moving.length) : ordered.slice(0, moving.length);
  if (run.every((element) => moved.has(element.id))) {
    return {};
  }
  // The order the group ends in, which the fallback renumbers against.
  const settled = place === 'front' ? [...rest, ...moving] : [...moving, ...rest];
  const renumber = (): Record<string, string> => {
    const fresh = initialKeys(settled.length);
    return Object.fromEntries(settled.map((element, index) => [element.id, fresh[index]]));
  };
  const keys: Record<string, string> = {};
  try {
    if (place === 'front') {
      let previous = rest[rest.length - 1].z;
      for (const element of moving) {
        previous = between(previous === '' ? undefined : previous, undefined);
        keys[element.id] = previous;
      }
      return keys;
    }
    const limit = rest[0].z;
    // Nothing to go under, so the group is renumbered from the bottom with the moved elements first.
    if (limit === '') {
      return renumber();
    }
    let next = limit;
    for (let index = moving.length - 1; index >= 0; index--) {
      next = between(undefined, next);
      keys[moving[index].id] = next;
    }
    return keys;
  } catch {
    // No key fits past the edge the group is moving to (a stored key with a trailing zero): renumber it whole.
    return renumber();
  }
};
