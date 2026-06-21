//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { invariant } from '@dxos/invariant';
import { getDeep } from '@dxos/util';

import type * as internal from './internal';

/**
 * Path to a value within a document, addressing nested records and arrays.
 */
export type KeyPath = readonly (string | number)[];

/**
 * Opaque change-history markers for a document (Automerge heads under the hood).
 */
export type Heads = string[];

/**
 * Mutates the document in place within a transactional change.
 */
export type ChangeFn<T> = (doc: T) => void;

/**
 * Options for a change transaction.
 */
export type ChangeOptions<T> = {
  message?: string;
  time?: number;
};

/**
 * Readonly view of a document snapshot.
 */
export type Snapshot<T> = { readonly [P in keyof T]: T[P] };

/**
 * Low-level handle over a CRDT document. The concrete backing (Automerge) is supplied by
 * `@dxos/echo-client`; this interface is intentionally free of any Automerge dependency so it can
 * live in the lower `@dxos/echo` layer.
 */
export interface Handle<T = any> {
  doc(): Snapshot<T> | undefined;
  change(callback: ChangeFn<T>, options?: ChangeOptions<T>): void;
  changeAt(heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): Heads | undefined;
  addListener(event: 'change', listener: () => void): void;
  removeListener(event: 'change', listener: () => void): void;
}

/**
 * Accessor that binds a value at `path` within a document `handle`. Editors (e.g. the CodeMirror
 * binding) consume this to sync against the underlying CRDT.
 */
export interface Accessor<T = any> {
  get handle(): Handle<T>;
  get path(): KeyPath;
}

/**
 * Reads the current value an accessor points at.
 */
export const getValue = <T>(accessor: Accessor): T => getDeep(accessor.handle.doc(), accessor.path) as T;

/**
 * Validates a {@link KeyPath}.
 */
export const isValidKeyPath = (value: unknown): value is KeyPath =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string' || typeof entry === 'number');

/**
 * Supplies the concrete {@link Accessor} for an object. Registered by `@dxos/echo-client` via
 * {@link setProvider}; mirrors the `RefResolver` dependency-inversion seam.
 */
export interface Provider {
  getAccessor(obj: internal.AnyProperties, path: KeyPath): Accessor;
}

let currentProvider: Provider | undefined;

/**
 * Registers the document-accessor provider. Called once by `@dxos/echo-client`.
 */
export const setProvider = (provider: Provider): void => {
  currentProvider = provider;
};

/**
 * Resolves an {@link Accessor} for a value within an object, agnostic to whether the object is
 * in-memory or attached to a database. Requires `@dxos/echo-client` to have registered a provider.
 */
export const getAccessor: {
  <T extends internal.AnyProperties>(obj: T, path: KeyPath | keyof T): Accessor<T>;
} = (obj, path) => {
  invariant(currentProvider, 'Document accessor provider is not registered (requires @dxos/echo-client).');
  return currentProvider.getAccessor(obj, Array.isArray(path) ? path : [path as string | number]);
};
