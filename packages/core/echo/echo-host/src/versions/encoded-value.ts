//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';

//
// Comparing encoded (Automerge-primitive) values, so a translation never writes a value a document already holds.
//

/** Whether `value` is a plain object, not an array or null. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Structural equality between two encoded (Automerge-primitive) values: `A.RawString`, `Uint8Array`,
 * `EncodedReference` (`{ '/': uri }`), plain arrays and objects.
 */
export const encodedValuesEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }
  if (a instanceof A.RawString || b instanceof A.RawString) {
    return String(a) === String(b);
  }
  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    return a.length === b.length && a.every((byte, index) => byte === b[index]);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => encodedValuesEqual(value, b[index]));
  }
  if (isRecord(a) && isRecord(b)) {
    const aKeys = Object.keys(a);
    return (
      aKeys.length === Object.keys(b).length &&
      aKeys.every((key) => Object.hasOwn(b, key) && encodedValuesEqual(a[key], b[key]))
    );
  }
  return false;
};
