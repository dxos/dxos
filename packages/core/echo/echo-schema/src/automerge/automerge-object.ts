//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type AutomergeObjectCore } from './automerge-object-core';
import { type DocAccessor } from './automerge-types';
import { isValidKeyPath, type KeyPath } from './key-path';
import type * as echoHandlerModule from '../effect/echo-handler'; // Keep as type-only import.
import { getProxyHandlerSlot, isReactiveProxy } from '../effect/proxy';
import { type ReactiveObject } from '../effect/reactive';
import { type OpaqueEchoObject } from '../object';

// TODO(wittjosiah): `path` should be `keyof T`.
export const createDocAccessor = <T>(obj: ReactiveObject<T>, path: KeyPath): DocAccessor => {
  invariant(isReactiveProxy(obj));
  invariant(path === undefined || isValidKeyPath(path));

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getObjectCoreFromEchoTarget }: typeof echoHandlerModule = require('../effect/echo-handler');
  const core = getObjectCoreFromEchoTarget(getProxyHandlerSlot(obj).target as any);
  return core.getDocAccessor(path);
};

export const getAutomergeObjectCore = (obj: OpaqueEchoObject): AutomergeObjectCore => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getObjectCoreFromEchoTarget }: typeof echoHandlerModule = require('../effect/echo-handler');
  return getObjectCoreFromEchoTarget(getProxyHandlerSlot(obj).target as any);
};
