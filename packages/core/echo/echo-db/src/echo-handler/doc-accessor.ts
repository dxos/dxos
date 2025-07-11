//
// Copyright 2025 DXOS.org
//

import type { BaseObject } from '@dxos/echo-schema';
import { assertArgument } from '@dxos/invariant';
import { isLiveObject, type Live } from '@dxos/live-object';

import { getObjectCore } from './echo-handler';
import { symbolPath, type ProxyTarget } from './echo-proxy-target';
import { isValidKeyPath, type DocAccessor, type KeyPath } from '../core-db/types';

//   TODO(burdon): Move to @dxos/live-object?
export const createDocAccessor = <T extends BaseObject>(obj: Live<T>, path: KeyPath | keyof T): DocAccessor<T> => {
  if (!Array.isArray(path)) {
    path = [path as any];
  }

  assertArgument(isLiveObject(obj), 'expect obj to be a LiveObject');
  assertArgument(path === undefined || isValidKeyPath(path), 'expect path to be a valid key path');

  const core = getObjectCore(obj);
  const basePath = (obj as any as ProxyTarget)[symbolPath];
  const fullPath = basePath ? [...basePath, ...path] : path;
  return core.getDocAccessor(fullPath);
};
