//
// Copyright 2026 DXOS.org
//

import { RefTypeId } from '../Ref/ref.ts';

/**
 * Snapshot a value to create a new reference for atom change-detection and React dependency tracking.
 * Objects and arrays are shallow-copied (a fresh reference each read, so an in-place mutation is
 * observed); primitives are returned as-is (so they dedupe via `!==`). Shared by the object-property
 * and annotation atom families.
 */
export const snapshotForComparison = <V>(value: V): V => {
  if (Array.isArray(value)) {
    return [...value] as V;
  }
  if (value !== null && typeof value === 'object') {
    return { ...value } as V;
  }
  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isRefLike = (value: unknown): value is { uri: { toString(): string } } =>
  value !== null && typeof value === 'object' && RefTypeId in value;

// Refs compare by URI: `RefImpl` mints a fresh wrapper on every property read, so `Object.is` never
// matches two reads of the same element.
const elementEquals = (a: unknown, b: unknown): boolean => {
  if (isRefLike(a) && isRefLike(b)) {
    return a.uri.toString() === b.uri.toString();
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
    return value.length === snapshot.length && value.every((item, index) => elementEquals(item, snapshot[index]));
  }
  if (isRecord(value) || isRecord(snapshot)) {
    return false;
  }
  return Object.is(value, snapshot);
};
