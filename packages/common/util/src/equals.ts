//
// Copyright 2026 DXOS.org
//

/**
 * Shallow (top-level) value equality. Distinguishes a genuinely new value from a new
 * object/array carrying the same content.
 */
export const shallowEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) {
    return true;
  }
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  // An array and a record are never the same value, and a sparse array's holes are absent from
  // `Object.keys`, so `[]` would otherwise equal `{}` and `new Array(1)` would equal `[]`.
  const isArray = Array.isArray(a);
  if (isArray !== Array.isArray(b)) {
    return false;
  }
  if (isArray && (a as unknown[]).length !== (b as unknown[]).length) {
    return false;
  }
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key) => Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
};
