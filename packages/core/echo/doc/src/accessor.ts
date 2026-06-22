//
// Copyright 2025 DXOS.org
//

import type { ChangeFn, ChangeOptions, Doc, Heads } from '@automerge/automerge';

import { getDeep } from '@dxos/util';

/**
 * Path to a value within a document, addressing nested records and arrays.
 */
export type KeyPath = readonly (string | number)[];

/**
 * Low-level handle over an Automerge document.
 */
export interface IDocHandle<T = any> {
  doc(): Doc<T> | undefined; // TODO(burdon): Remove undefined.
  change(callback: ChangeFn<T>, options?: ChangeOptions<T>): void;
  changeAt(heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): Heads | undefined;
  addListener(event: 'change', listener: () => void): void;
  removeListener(event: 'change', listener: () => void): void;
}

/**
 * Binds a value at `path` within a document `handle`. Editors and the document operations in this
 * package consume this to read and mutate the underlying Automerge document.
 */
export interface DocAccessor<T = any> {
  get handle(): IDocHandle<T>;
  get path(): KeyPath;
}

export const DocAccessor = {
  getValue: <T>(accessor: DocAccessor): T => getDeep(accessor.handle.doc(), accessor.path) as T,
};

/**
 * Validates a {@link KeyPath}.
 */
export const isValidKeyPath = (value: unknown): value is KeyPath =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string' || typeof entry === 'number');
