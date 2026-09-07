//
// Copyright 2026 DXOS.org
//

import { useRef } from 'react';

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
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key) => Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
};

/**
 * Holds the previous reference while the incoming value is shallow-equal to it, so a value
 * assembled inline by the caller keeps a stable identity across the caller's renders.
 *
 * Surface `data` is the motivating case: nearly every call site passes an object literal
 * (`data={{ subject }}`), which is a fresh reference on each of the caller's renders and defeats
 * every memo boundary below it. Shallow equality is the right depth because the values inside are
 * already stable — an ECHO object is a singleton proxy whose identity never changes on mutation,
 * so a surface subtree stays fresh through its own subscriptions rather than through re-renders
 * propagated from above.
 *
 * The ref is written during render. A render React discards can leave the ref holding the
 * discarded value, which costs identity stability on the next render but never correctness: the
 * returned value is always shallow-equal to `value`.
 */
export const useShallowStable = <T>(value: T): T => {
  const ref = useRef(value);
  if (!shallowEqual(ref.current, value)) {
    ref.current = value;
  }
  return ref.current;
};
