//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { Doc, createObject, getObjectCore, isEchoObject } from '@dxos/echo-client';
import { type AnyProperties, isProxy } from '@dxos/echo/internal';
import { assertArgument } from '@dxos/invariant';

// TODO(burdon): Reduce the dependency on @dxos/echo-client (e.g. move ObjectCore lower or invert).

export type KeyPath = Doc.KeyPath;

export const isKeyPath = Doc.isKeyPath;

export type Handle<T = any> = Doc.Handle<T>;

export type Accessor<T = any> = Doc.Accessor<T>;

export const getValue = Doc.getValue;

/**
 * Resolves an {@link Accessor} for a value within an object, agnostic to whether the object is
 * in-memory or attached to a database. An `Obj.make` object has no `ObjectCore` until `db.add`,
 * so an in-memory core is materialized (via `createObject`) to let the accessor bind before
 * persistence; the object's edits then survive a later `db.add`.
 */
export const createAccessor = <T extends AnyProperties>(
  obj: T,
  path: KeyPath | Extract<keyof T, string | number>,
): Accessor<T> => {
  const keyPath: KeyPath = Array.isArray(path) ? path : [path];
  assertArgument(isProxy(obj), 'obj', 'expect obj to be a LiveObject');
  assertArgument(isKeyPath(keyPath), 'path', 'expect path to be a valid key path');

  const live: AnyProperties = isEchoObject(obj) ? obj : createObject(obj);
  return getObjectCore(live).getDocAccessor(keyPath);
};
