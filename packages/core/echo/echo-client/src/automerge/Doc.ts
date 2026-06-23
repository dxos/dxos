//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type { ChangeFn, ChangeOptions, Doc, Heads } from '@automerge/automerge';

import { getDeep } from '@dxos/util';

/**
 * Path to a value within a document, addressing nested records and arrays.
 */
export type KeyPath = readonly (string | number)[];

/**
 * Validates a {@link KeyPath}.
 */
export const isKeyPath = (value: unknown): value is KeyPath =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string' || typeof entry === 'number');

/**
 * Low-level handle over an Automerge document.
 * A deliberately narrow contract (vs. automerge-repo's `DocHandle`) satisfied by both the networked client
 * handle and the synthetic handle over a local, not-yet-attached document.
 */
export interface Handle<T = any> {
  doc(): Doc<T>;
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

/**
 * Returns the value at the accessor's path within its document.
 * The cast to T is unavoidable: path is a dynamic key sequence resolved at runtime by `getDeep`,
 * so the static type cannot be narrowed beyond `unknown` at this boundary.
 */
// TODO(burdon): Remove V since we don't check.
export const getValue = <V, T = any>(accessor: Accessor<T>): V => getDeep(accessor.handle.doc(), accessor.path) as V;
