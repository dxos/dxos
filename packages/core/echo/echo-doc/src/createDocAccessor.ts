//
// Copyright 2025 DXOS.org
//

import { createObject, getObjectCore, isEchoObject } from '@dxos/echo-client';
import { type AnyProperties, isProxy } from '@dxos/echo/internal';
import { assertArgument } from '@dxos/invariant';

import * as Doc from './Doc';

/**
 * Resolves a {@link Doc.Accessor} for a value within an object, agnostic to whether the object is
 * in-memory or attached to a database. An `Obj.make` object has no `ObjectCore` until `db.add`, so
 * an in-memory core is materialized (via `createObject`) to let the accessor bind before
 * persistence; the object's edits then survive a later `db.add`.
 */
// TODO(burdon): Reduce the dependency on @dxos/echo-client (e.g. move ObjectCore lower or invert).
export const createDocAccessor = <T extends AnyProperties>(obj: T, path: Doc.KeyPath | keyof T): Doc.Accessor<T> => {
  const keyPath = Array.isArray(path) ? path : [path as string | number];
  assertArgument(isProxy(obj), 'obj', 'expect obj to be a LiveObject');
  assertArgument(Doc.isValidKeyPath(keyPath), 'path', 'expect path to be a valid key path');

  const live: AnyProperties = isEchoObject(obj) ? obj : createObject(obj);
  return getObjectCore(live).getDocAccessor(keyPath);
};
