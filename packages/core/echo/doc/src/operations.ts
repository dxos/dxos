//
// Copyright 2025 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { getDeep } from '@dxos/util';

import * as Doc from './Doc';

/**
 * Automerge change patch, re-exported so consumers can interpret {@link diff} results without
 * importing `@automerge/automerge` directly.
 */
export type Patch = A.Patch;

/**
 * Mutates the document the accessor points into within a single Automerge change.
 */
export const change = <T>(accessor: Doc.Accessor<T>, mutator: (doc: T) => void): void => {
  accessor.handle.change(mutator);
};

/**
 * Splices the string the accessor points at: removes `deleteCount` characters at `index` and inserts `text`.
 */
export const splice = (accessor: Doc.Accessor, index: number, deleteCount: number, text: string): void => {
  accessor.handle.change((doc) => {
    // Automerge's `splice` types the path as mutable `Prop[]`; our `KeyPath` is readonly and is not mutated here.
    A.splice(doc, accessor.path as A.Prop[], index, deleteCount, text);
  });
};

/**
 * Appends text to the end of the string the accessor points at.
 */
export const append = (accessor: Doc.Accessor, text: string): void => {
  const current = Doc.Accessor.getValue<string>(accessor) ?? '';
  splice(accessor, current.length, 0, text);
};

/**
 * Subscribes to document changes. Returns an unsubscribe function.
 */
export const onChange = (accessor: Doc.Accessor, callback: () => void): (() => void) => {
  accessor.handle.addListener('change', callback);
  return () => accessor.handle.removeListener('change', callback);
};

/**
 * Reads the value at a sub-path relative to the accessor's path.
 */
export const getValueAt = <T>(accessor: Doc.Accessor, subPath: Doc.KeyPath = []): T | undefined =>
  getDeep(accessor.handle.doc(), [...accessor.path, ...subPath]) as T | undefined;

/**
 * Current change-history heads of the underlying document.
 */
export const getHeads = (accessor: Doc.Accessor): A.Heads => A.getHeads(accessor.handle.doc()!);

/**
 * Patches between two sets of heads. Returns an empty array when the heads are equal.
 */
export const diff = (accessor: Doc.Accessor, from: A.Heads, to: A.Heads): Patch[] => {
  if (A.equals(from, to)) {
    return [];
  }
  return A.diff(accessor.handle.doc()!, from, to);
};
