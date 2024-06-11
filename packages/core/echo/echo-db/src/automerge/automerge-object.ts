//
// Copyright 2023 DXOS.org
//

import { getProxyHandlerSlot, isReactiveObject } from '@dxos/echo-schema';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { type DocAccessor } from './automerge-types';
import { isValidKeyPath, type KeyPath } from './key-path';
import { type ObjectCore } from './object-core';
import { getObjectCoreFromEchoTarget } from '../echo-handler/echo-handler';

// TODO(wittjosiah): `path` should be `keyof T`.
export const createDocAccessor = <T>(obj: EchoReactiveObject<T>, path: KeyPath): DocAccessor => {
  invariant(isReactiveObject(obj));
  invariant(path === undefined || isValidKeyPath(path));

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const core = getObjectCoreFromEchoTarget(getProxyHandlerSlot(obj).target as any);
  return core.getDocAccessor(path);
};

export const getObjectCore = <T>(obj: EchoReactiveObject<T>): ObjectCore => {
  return getObjectCoreFromEchoTarget(getProxyHandlerSlot(obj).target as any);
};
