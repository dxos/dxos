//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { type Database, Ref } from '@dxos/echo';
import { DATA_NAMESPACE, EncodedReference, isEncodedReference } from '@dxos/echo-protocol';
import { deepMapValues, getDeep } from '@dxos/util';

import { type ObjectCore } from '../core-db/object-core.ts';

//
// Shared by every writer onto an `ObjectCore`'s raw document keys — the migration runner
// (`database.ts#applyObjectMigration`), the fold-forward runner (`fold-forward.ts`), cross-object
// `assign`/`ensure` (`migration-context.ts`), and fan-in/array-fan-out (`fan-in.ts`,
// `array-fan-out.ts`): all write a plain-JS write set and must guard every write with a value-compare
// (M0-REPORT.md design item 1 — an unguarded fold loop never settles). Kept in its own module, rather
// than exported from any one caller, so none of them pulls another in and creates an import cycle.
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

/**
 * `core`'s decoded data body as of `heads`, with every stored reference resolved to a `Ref`, so a
 * transform, lens or `absorb` recomputed during fold-forward reads the same value shapes it read at
 * migration time.
 */
export const getDecodedDataWithRefs = (
  db: Database.Database,
  core: ObjectCore,
  heads: A.Heads,
): Record<string, unknown> => {
  const data = core.decode(getDeep(A.view(core.getDoc(), heads), [...core.mountPath, DATA_NAMESPACE]));
  if (!isRecord(data)) {
    return {};
  }
  return deepMapValues(data, (value, recurse) => {
    if (isEncodedReference(value)) {
      return db.makeRef(EncodedReference.toURI(value));
    }
    if (value instanceof Uint8Array) {
      return value;
    }
    return recurse(value);
  });
};

/**
 * The entries of `after` whose encoded value differs from the same key in `before`: the keys a
 * recomputed migration output actually moved between two snapshots of its source.
 */
export const changedOutputEntries = (
  core: ObjectCore,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, unknown> => {
  const encodedBefore = mapRefsToEncodedReferences(before);
  const encodedAfter = mapRefsToEncodedReferences(after);
  return Object.fromEntries(
    Object.entries(after).filter(
      ([key]) => !encodedValuesEqual(core.encode(encodedAfter[key]), core.encode(encodedBefore[key])),
    ),
  );
};

/**
 * The data keys of `output` whose encoded value actually differs from `core`'s current document —
 * the value-compare guard shared by every writer onto an `ObjectCore`'s data namespace: the migration
 * runner's own change, a cross-object `assign`, and a fan-in absorption. A key `output` maps to
 * `undefined` is skipped, matching `core.encode`'s own object-valued branch, which never writes
 * `undefined` entries to the document.
 */
export const computeGuardedDataWrites = (core: ObjectCore, output: Record<string, unknown>): Map<string, unknown> => {
  const mappedOutput = mapRefsToEncodedReferences(output);
  const writes = new Map<string, unknown>();
  for (const [key, value] of Object.entries(mappedOutput)) {
    if (value === undefined) {
      continue;
    }
    const encoded = core.encode(value);
    if (!encodedValuesEqual(encoded, core.getRaw([DATA_NAMESPACE, key]))) {
      writes.set(key, encoded);
    }
  }
  return writes;
};
