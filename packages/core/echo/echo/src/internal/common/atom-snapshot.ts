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
