//
// Copyright 2025 DXOS.org
//

import type { ChangeFn, ChangeOptions, Doc as AutomergeDoc, Heads } from '@automerge/automerge';

import { getDeep } from '@dxos/util';

/**
 * Path to a value within a document, addressing nested records and arrays.
 */
export type KeyPath = readonly (string | number)[];

/**
 * Validates a {@link KeyPath}.
 */
export const isValidKeyPath = (value: unknown): value is KeyPath =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string' || typeof entry === 'number');

/**
 * Low-level handle over an Automerge document. A deliberately narrow contract (vs. automerge-repo's
 * `DocHandle`) satisfied by both the networked client handle and the synthetic handle over a local,
 * not-yet-attached document.
 */
export interface Handle<T = any> {
  doc(): AutomergeDoc<T> | undefined; // TODO(burdon): Remove undefined.
  change(callback: ChangeFn<T>, options?: ChangeOptions<T>): void;
  changeAt(heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): Heads | undefined;
  addListener(event: 'change', listener: () => void): void;
  removeListener(event: 'change', listener: () => void): void;
}

/**
 * Binds a value at `path` within a document `handle`. Editors and document operations consume this
 * to read and mutate the underlying Automerge document.
 */
export interface Accessor<T = any> {
  get path(): KeyPath;
  get handle(): Handle<T>;
}

export const Accessor = {
  getValue: <T>(accessor: Accessor): T => getDeep(accessor.handle.doc(), accessor.path) as T,
};
