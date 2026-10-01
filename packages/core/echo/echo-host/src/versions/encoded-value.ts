//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';

//
// Comparing encoded (Automerge-primitive) values, shared by the writers that must not write a value a
// document already holds: version translation here, and the in-place migration runners in the client.
//

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Structural equality between two ENCODED (automerge-primitive) values: `A.RawString`, `Uint8Array`,
 * `EncodedReference` (`{ '/': uri }`), plain arrays/objects. Guards every migration/fold write so a
 * value that already matches the document produces no automerge op.
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
