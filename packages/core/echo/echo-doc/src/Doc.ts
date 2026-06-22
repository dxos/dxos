//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { Doc as ClientDoc, createObject, getObjectCore, isEchoObject } from '@dxos/echo-client';
import { type AnyProperties, isProxy } from '@dxos/echo/internal';
import { assertArgument } from '@dxos/invariant';

// The accessor abstraction is owned by `@dxos/echo-client` (alongside `ObjectCore`); re-exported here
// as the canonical `Doc.*` surface so consumers depend only on `@dxos/echo-doc`.
export type KeyPath = ClientDoc.KeyPath;
export type Handle<T = any> = ClientDoc.Handle<T>;
export type Accessor<T = any> = ClientDoc.Accessor<T>;
export const Accessor = ClientDoc.Accessor;
export const isValidKeyPath = ClientDoc.isValidKeyPath;

/**
 * Resolves an {@link Accessor} for a value within an object, agnostic to whether the object is
 * in-memory or attached to a database. An `Obj.make` object has no `ObjectCore` until `db.add`, so
 * an in-memory core is materialized (via `createObject`) to let the accessor bind before
 * persistence; the object's edits then survive a later `db.add`.
 */
// TODO(burdon): Reduce the dependency on @dxos/echo-client (e.g. move ObjectCore lower or invert).
export const createAccessor = <T extends AnyProperties>(
  obj: T,
  path: KeyPath | Extract<keyof T, string | number>,
): Accessor<T> => {
  const keyPath: KeyPath = Array.isArray(path) ? path : [path];
  assertArgument(isProxy(obj), 'obj', 'expect obj to be a LiveObject');
  assertArgument(isValidKeyPath(keyPath), 'path', 'expect path to be a valid key path');

  const live: AnyProperties = isEchoObject(obj) ? obj : createObject(obj);
  return getObjectCore(live).getDocAccessor(keyPath);
};
