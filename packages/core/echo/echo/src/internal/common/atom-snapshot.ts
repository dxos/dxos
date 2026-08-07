//
// Copyright 2026 DXOS.org
//

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

/**
 * Shallow content equality between a live value and a previously emitted snapshot. The change
 * checks in the atom families cannot compare snapshots by identity: `snapshotForComparison` mints
 * a fresh reference on every read, so two snapshots of *unchanged* content still fail `===` and
 * the atom re-fires on every mutation of the owning object — which is how one message delete
 * produced a 5-20x render storm in the comments thread (the `messages` atom re-fired for every
 * unrelated property write). Content comparison restores `makeProperty`'s documented contract.
 */
export const snapshotEquals = (value: unknown, snapshot: unknown): boolean => {
  if (Array.isArray(value) && Array.isArray(snapshot)) {
    return value.length === snapshot.length && value.every((item, index) => Object.is(item, snapshot[index]));
  }
  if (isRecord(value) && isRecord(snapshot)) {
    const keys = Object.keys(value);
    return keys.length === Object.keys(snapshot).length && keys.every((key) => Object.is(value[key], snapshot[key]));
  }
  return Object.is(value, snapshot);
};
