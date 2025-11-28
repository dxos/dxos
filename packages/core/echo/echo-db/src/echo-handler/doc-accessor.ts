//
// Copyright 2025 DXOS.org
//

import { type AnyProperties } from '@dxos/echo/internal';
import { assertArgument } from '@dxos/invariant';
import { type Live, isLiveObject } from '@dxos/live-object';

import { type DocAccessor, type KeyPath, isValidKeyPath } from '../core-db';

import { getObjectCore } from './echo-handler';
import { type ProxyTarget, symbolPath } from './echo-proxy-target';

export const createDocAccessor = <T extends AnyProperties>(obj: Live<T>, path: KeyPath | keyof T): DocAccessor<T> => {
  if (!Array.isArray(path)) {
    path = [path as any];
  }

  // TODO(burdon): Currently in tests objects must be created using `createObject`.
  assertArgument(isLiveObject(obj), 'obj', 'expect obj to be a LiveObject');
  assertArgument(path === undefined || isValidKeyPath(path), 'path', 'expect path to be a valid key path');

  const core = getObjectCore(obj);
  const basePath = (obj as any as ProxyTarget)[symbolPath];
  const fullPath = basePath ? [...basePath, ...path] : path;
  return core.getDocAccessor(fullPath);
};
