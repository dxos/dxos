//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { Ref } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { deepMapValues } from '@dxos/util';

//
// Shared by the migration runner (`database.ts#applyObjectMigration`) and the fold-forward runner
// (`fold-forward.ts`): both write a migration's/lens's plain-JS write set onto an `ObjectCore`'s raw
// document keys and must guard every write with a value-compare (M0-REPORT.md design item 1 — an
// unguarded fold loop never settles). Kept in its own module, rather than exported from either
// caller, so neither pulls the other in and creates an import cycle.
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

/**
 * Replaces every `Ref` in a transform/lens write set with its storable `EncodedReference`: a write
 * set is expected to carry over refs it already has, not mint/link new unsaved targets, so no ref-
 * resolver round trip is needed here.
 */
export const mapRefsToEncodedReferences = (output: Record<string, unknown>): Record<string, unknown> =>
  deepMapValues(output, (value, recurse) => {
    if (Ref.isRef(value)) {
      return EncodedReference.fromURI(value.uri);
    }
    if (value instanceof Uint8Array) {
      return value;
    }
    return recurse(value);
  });
