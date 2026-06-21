//
// Copyright 2025 DXOS.org
//

import { Doc } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { isProxy } from '@dxos/echo/internal';
import { assertArgument } from '@dxos/invariant';

import { type DocAccessor, type KeyPath, isValidKeyPath } from '../core-db';
import { createObject, getObjectCore } from './echo-handler';
import { type ProxyTarget, symbolInternals, symbolPath } from './echo-proxy-target';

export const createDocAccessor = <T extends AnyProperties>(obj: T, path: KeyPath | keyof T): DocAccessor<T> => {
  if (!Array.isArray(path)) {
    path = [path as any];
  }

  assertArgument(isProxy(obj), 'obj', 'expect obj to be a LiveObject');
  assertArgument(path === undefined || isValidKeyPath(path), 'path', 'expect path to be a valid key path');

  // A reactive object created via `Obj.make` has no `ObjectCore` until `db.add`. Materialize an
  // in-memory core so the accessor can bind before persistence; `createObject` swaps the proxy in
  // place, so the caller's reference stays attachable and its edits survive a later `db.add`.
  const live: AnyProperties = (obj as any as ProxyTarget)[symbolInternals] ? obj : createObject(obj);

  const core = getObjectCore(live);
  const basePath = (live as any as ProxyTarget)[symbolPath];
  const fullPath = basePath ? [...basePath, ...path] : path;
  return core.getDocAccessor(fullPath);
};

// Fulfil the agnostic `Doc.getAccessor` API declared in `@dxos/echo`. Mirrors the `RefResolver`
// dependency-inversion seam: `@dxos/echo` owns the API, `@dxos/echo-client` supplies the
// Automerge-backed implementation when this module is loaded.
Doc.setProvider({
  getAccessor: (obj, path) => createDocAccessor(obj, path),
});
