//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type AutomergeObjectCore } from './automerge-object-core';
import { type DocAccessor } from './automerge-types';
import { isValidKeyPath, type KeyPath } from './key-path';
import { getObjectCoreFromEchoTarget } from '../echo-handler/echo-handler';
import { getProxyHandlerSlot, isReactiveObject } from '../effect';
import { type EchoReactiveObject } from '../effect';

// TODO(wittjosiah): `path` should be `keyof T`.
export const createDocAccessor = <T>(obj: EchoReactiveObject<T>, path: KeyPath): DocAccessor => {
  invariant(isReactiveObject(obj));
  invariant(path === undefined || isValidKeyPath(path));

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const core = getObjectCoreFromEchoTarget(getProxyHandlerSlot(obj).target as any);
  return core.getDocAccessor(path);
};

export const getAutomergeObjectCore = <T>(obj: EchoReactiveObject<T>): AutomergeObjectCore => {
  return getObjectCoreFromEchoTarget(getProxyHandlerSlot(obj).target as any);
};
