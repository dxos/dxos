//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';

import { isEncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { getDeep, setDeep } from '@dxos/util';

import { encodedValuesEqual, isRecord } from './encoded-value.ts';

//
// The edits a per-change fold writes (`fold-forward.ts#foldLateChanges`): pure functions of the fold's
// inputs, so every peer that folds the same late change writes the same ops.
//

/** Each change's deps, by change hash. */
export type ChangeGraph = Map<string, readonly string[]>;

/** `hashes` and every change they depend on. */
export const ancestorsOf = (graph: ChangeGraph, hashes: Iterable<string>): Set<string> => {
  const seen = new Set<string>();
  const stack = [...hashes];
  for (let hash = stack.pop(); hash !== undefined; hash = stack.pop()) {
    if (!seen.has(hash)) {
      seen.add(hash);
      stack.push(...(graph.get(hash) ?? []));
    }
  }
  return seen;
};

/** The heads `hashes` span: each one no other of them depends on, sorted so equal sets compare equal. */
export const frontierOf = (graph: ChangeGraph, hashes: Iterable<string>): Heads => {
  const unique = [...new Set(hashes)];
  const covered = ancestorsOf(
    graph,
    unique.flatMap((hash) => graph.get(hash) ?? []),
  );
  return unique.filter((hash) => !covered.has(hash)).sort();
};

/** A record that is a map in the document, not an encoded reference. */
export const isMapValue = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && !isEncodedReference(value) && !(value instanceof A.RawString) && !(value instanceof Uint8Array);

/** Middles larger than this (in compared cells) are left unmatched instead of running a quadratic LCS. */
const LIST_DIFF_LIMIT = 250_000;

/**
 * Index pairs of a longest common subsequence of `from` and `to`, by encoded value: the common prefix and
 * suffix, plus an LCS of the middle when it is small enough, so a single insert or delete is exact at
 * any length.
 */
const commonSubsequence = (from: readonly unknown[], to: readonly unknown[]): [number, number][] => {
  let prefix = 0;
  while (prefix < from.length && prefix < to.length && encodedValuesEqual(from[prefix], to[prefix])) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < from.length - prefix &&
    suffix < to.length - prefix &&
    encodedValuesEqual(from[from.length - 1 - suffix], to[to.length - 1 - suffix])
  ) {
    suffix++;
  }
  const pairs: [number, number][] = Array.from({ length: prefix }, (_, index) => [index, index]);
  const rows = from.length - prefix - suffix;
  const columns = to.length - prefix - suffix;
  if (rows * columns <= LIST_DIFF_LIMIT) {
    const lengths = Array.from({ length: rows + 1 }, () => new Array<number>(columns + 1).fill(0));
    for (let row = rows - 1; row >= 0; row--) {
      for (let column = columns - 1; column >= 0; column--) {
        lengths[row][column] = encodedValuesEqual(from[prefix + row], to[prefix + column])
          ? lengths[row + 1][column + 1] + 1
          : Math.max(lengths[row + 1][column], lengths[row][column + 1]);
      }
    }
    for (let row = 0, column = 0; row < rows && column < columns;) {
      if (encodedValuesEqual(from[prefix + row], to[prefix + column])) {
        pairs.push([prefix + row, prefix + column]);
        row++;
        column++;
      } else if (lengths[row + 1][column] >= lengths[row][column + 1]) {
        row++;
      } else {
        column++;
      }
    }
  }
  for (let offset = suffix; offset > 0; offset--) {
    pairs.push([from.length - offset, to.length - offset]);
  }
  return pairs;
};

/** One edit to a list, at an index of the list being edited. */
type ListEdit =
  | { kind: 'update'; index: number; previous: unknown; next: unknown }
  | { kind: 'delete'; index: number }
  | { kind: 'insert'; index: number; values: unknown[] };

/**
 * The edit that turns `previous` into `next`, placed on `current`: each element of `previous` is located
 * in `current` by a common subsequence, so an element a concurrent fold placed elsewhere is edited where
 * it is, and one already gone is skipped.
 */
const rebaseListEdit = (previous: readonly unknown[], next: readonly unknown[], current: readonly unknown[]) => {
  const located = new Map(commonSubsequence(previous, current));
  /** Where an insert after `previous[index]` goes in `current`: after the nearest located element at or before it. */
  const insertIndex = (index: number): number => {
    for (let candidate = index; candidate >= 0; candidate--) {
      const at = located.get(candidate);
      if (at !== undefined) {
        return at + 1;
      }
    }
    return 0;
  };

  const edits: ListEdit[] = [];
  let previousIndex = 0;
  let nextIndex = 0;
  for (const [previousMatch, nextMatch] of [...commonSubsequence(previous, next), [previous.length, next.length]]) {
    const paired = Math.min(previousMatch - previousIndex, nextMatch - nextIndex);
    for (let offset = 0; offset < paired; offset++) {
      const index = located.get(previousIndex + offset);
      if (index !== undefined) {
        edits.push({
          kind: 'update',
          index,
          previous: previous[previousIndex + offset],
          next: next[nextIndex + offset],
        });
      }
    }
    for (let removed = previousIndex + paired; removed < previousMatch; removed++) {
      const index = located.get(removed);
      if (index !== undefined) {
        edits.push({ kind: 'delete', index });
      }
    }
    const values = next.slice(nextIndex + paired, nextMatch);
    if (values.length > 0) {
      edits.push({ kind: 'insert', index: insertIndex(previousIndex + paired - 1), values });
    }
    previousIndex = previousMatch + 1;
    nextIndex = nextMatch + 1;
  }
  // Applied from the end so every index stays valid; an insert lands after an edit at the same index.
  const order = { update: 0, delete: 0, insert: 1 } as const;
  return edits.sort((a, b) => b.index - a.index || order[a.kind] - order[b.kind]);
};

/**
 * Applies the edit a late change made, from `previous` to `next`, to the value at `path` in `draft`,
 * whose value there is `current`, as nested edits rather than one replacement: a map key by key (only
 * keys the change moved), a list by inserts, deletes and element edits placed on `current`'s elements,
 * and a string by a text diff to `next`. A concurrent direct edit elsewhere in the same map, list or text
 * therefore survives the merge. Anything else, or a value whose kind changed, is written whole.
 */
export const applyStructuralEdit = (
  draft: unknown,
  path: readonly (string | number)[],
  previous: unknown,
  next: unknown,
  current: unknown,
): void => {
  if (encodedValuesEqual(previous, next)) {
    return;
  }
  if (typeof current === 'string' && typeof next === 'string') {
    invariant(typeof draft === 'object' && draft !== null, 'fold draft is not a document');
    A.updateText(draft, [...path], next);
    return;
  }
  if (isMapValue(previous) && isMapValue(next) && isMapValue(current)) {
    const map = getDeep(draft, [...path]);
    invariant(isRecord(map), 'fold target is not a map');
    for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
      if (!Object.hasOwn(next, key)) {
        delete map[key];
      } else if (Object.hasOwn(current, key)) {
        applyStructuralEdit(draft, [...path, key], previous[key], next[key], current[key]);
      } else {
        map[key] = next[key];
      }
    }
    return;
  }
  if (Array.isArray(previous) && Array.isArray(next) && Array.isArray(current)) {
    const list = getDeep(draft, [...path]);
    invariant(Array.isArray(list), 'fold target is not a list');
    for (const edit of rebaseListEdit(previous, next, current)) {
      switch (edit.kind) {
        case 'update':
          applyStructuralEdit(draft, [...path, edit.index], edit.previous, edit.next, current[edit.index]);
          break;
        case 'delete':
          list.splice(edit.index, 1);
          break;
        case 'insert':
          list.splice(edit.index, 0, ...edit.values);
          break;
      }
    }
    return;
  }
  setDeep(draft, [...path], next);
};
