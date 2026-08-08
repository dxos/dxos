//
// Copyright 2026 DXOS.org
//

import { RefTypeId } from '../Ref/ref';

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

// `Ref` mints a fresh wrapper on every property read (see RefImpl), so `Object.is` never matches
// two reads of the same element and a `Ref[]` property (e.g. `Thread.messages`) would defeat the
// array dedupe entirely. Refs compare by URI instead.
const elementEquals = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) {
    return true;
  }
  if (isRefLike(a) && isRefLike(b)) {
    return a.uri.toString() === b.uri.toString();
  }
  return false;
};

/**
 * Change-detection equality between a live value and a previously emitted snapshot. The atom
 * families cannot compare snapshots by identity: `snapshotForComparison` mints a fresh reference
 * on every read, so two snapshots of *unchanged* content still fail `===` and the atom re-fires on
 * every mutation of the owning object — which is how one message delete produced a 5-20x render
 * storm in the comments thread (the `messages` atom re-fired for every unrelated property write).
 *
 * Arrays compare by shallow content: their elements are leaves in practice (refs, primitives), and
 * array-valued atoms are the ones that stormed. Records deliberately keep the legacy always-fire
 * behavior: consumers mutate nested fields in place (e.g. kanban's `arrangement.columns[x].ids`),
 * a shallow top-level comparison cannot see those writes, and suppressing them broke
 * `useKanbanBoardModel`'s arrangement ordering.
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
