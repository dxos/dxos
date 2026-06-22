//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type { ChangeFn, ChangeOptions, Doc as AutomergeDoc, Heads } from '@automerge/automerge';

import { createObject, getObjectCore, isEchoObject } from '@dxos/echo-client';
import { type AnyProperties, isProxy } from '@dxos/echo/internal';
import { assertArgument } from '@dxos/invariant';
import { getDeep } from '@dxos/util';

/**
 * Path to a value within a document, addressing nested records and arrays.
 */
export type KeyPath = readonly (string | number)[];

/**
 * Low-level handle over an Automerge document.
 * A deliberately narrow contract (vs. automerge-repo's `DocHandle`) satisfied by both the networked client handle and the synthetic handle
 * over a local, not-yet-attached document.
 */
export interface Handle<T = any> {
  doc(): AutomergeDoc<T> | undefined; // TODO(burdon): Remove undefined.
  change(callback: ChangeFn<T>, options?: ChangeOptions<T>): void;
  changeAt(heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): Heads | undefined;
  addListener(event: 'change', listener: () => void): void;
  removeListener(event: 'change', listener: () => void): void;
}

/**
 * Binds a value at `path` within a document `handle`. Editors and the document operations in this
 * package consume this to read and mutate the underlying Automerge document.
 */
export interface Accessor<T = any> {
  get path(): KeyPath;
  get handle(): Handle<T>;
}

export const Accessor = {
  getValue: <T>(accessor: Accessor): T => getDeep(accessor.handle.doc(), accessor.path) as T,
};

/**
 * Validates a {@link KeyPath}.
 */
export const isValidKeyPath = (value: unknown): value is KeyPath =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string' || typeof entry === 'number');

/**
 * Resolves an {@link Accessor} for a value within an object, agnostic to whether the object is
 * in-memory or attached to a database. An `Obj.make` object has no `ObjectCore` until `db.add`, so
 * an in-memory core is materialized (via `createObject`) to let the accessor bind before
 * persistence; the object's edits then survive a later `db.add`.
 */
// TODO(burdon): Reduce the dependency on @dxos/echo-client (e.g. move ObjectCore lower or invert).
export const createAccessor = <T extends AnyProperties>(obj: T, path: KeyPath | keyof T): Accessor<T> => {
  const keyPath = Array.isArray(path) ? path : [path as string | number];
  assertArgument(isProxy(obj), 'obj', 'expect obj to be a LiveObject');
  assertArgument(isValidKeyPath(keyPath), 'path', 'expect path to be a valid key path');

  const live: AnyProperties = isEchoObject(obj) ? obj : createObject(obj);
  return getObjectCore(live).getDocAccessor(keyPath);
};
