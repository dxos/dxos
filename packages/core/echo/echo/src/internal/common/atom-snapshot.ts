//
// Copyright 2026 DXOS.org
//

import { RefTypeId } from '../Ref/ref.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

type RefLike = {
  uri: { toString(): string };
  /** {@link RefImpl._getSavedTarget}; absent on a ref-like that is not a `RefImpl`. */
  _getSavedTarget?: () => unknown;
};

const isRefLike = (value: unknown): value is RefLike =>
  value !== null && typeof value === 'object' && RefTypeId in value;

/**
 * Snapshot a value to create a new reference for atom change-detection and React dependency tracking.
 * Objects and arrays are shallow-copied (a fresh reference each read, so an in-place mutation is
 * observed); primitives are returned as-is (so they dedupe via `!==`) and refs are too, since they
 * dedupe by URI and inlined target in {@link snapshotEquals}. Shared by the object-property and
 * annotation atom families.
 */
export const snapshotForComparison = <V>(value: V): V => {
  if (Array.isArray(value)) {
    return [...value] as V;
  }
  // Refs are immutable handles whose `uri`/`target` are prototype getters over private fields, so a
  // spread would hand the consumer an empty object — `useObject(obj, refField).uri` read `undefined`.
  if (isRefLike(value)) {
    return value;
  }
  if (value !== null && typeof value === 'object') {
    return { ...value } as V;
  }
  return value;
};

// Refs compare by URI: `RefImpl` mints a fresh wrapper on every property read, so `Object.is` never
// matches two reads of the same ref. The inlined target is part of the ref's encoded value
// (`{'/': uri, target}` for an object not yet in the database), so `Ref.make(target)` and a
// `noInline()` of it share a URI without being the same value — comparing the URI alone would
// swallow that update. The saved target is identity-stable across reads, so it needs no deeper
// comparison.
const valueEquals = (a: unknown, b: unknown): boolean => {
  if (isRefLike(a) || isRefLike(b)) {
    return (
      isRefLike(a) &&
      isRefLike(b) &&
      a.uri.toString() === b.uri.toString() &&
      a._getSavedTarget?.() === b._getSavedTarget?.()
    );
  }
  // Records before `Object.is`: the snapshot shallow-copies the array, so a record element mutated in
  // place is the same reference on both sides and would otherwise read as unchanged.
  if (isRecord(a) || isRecord(b)) {
    return false;
  }
  return Object.is(a, b);
};

/**
 * Change-detection equality between a live value and a previously emitted snapshot. Identity cannot
 * serve, because `snapshotForComparison` mints a fresh reference on every read, so unchanged content
 * still fails `===` and the atom re-fires on every mutation of the owning object.
 *
 * Records always compare unequal: consumers mutate nested fields in place (e.g. kanban's
 * `arrangement.columns[x].ids`), which a shallow top-level comparison cannot see.
 */
export const snapshotEquals = (value: unknown, snapshot: unknown): boolean => {
  if (Array.isArray(value) && Array.isArray(snapshot)) {
    return value.length === snapshot.length && value.every((item, index) => valueEquals(item, snapshot[index]));
  }
  // A ref held directly compares exactly as one inside an array does, so both go through `valueEquals`
  // — two ladders would drift and reintroduce the asymmetry that left a ref field always unequal.
  return valueEquals(value, snapshot);
};
