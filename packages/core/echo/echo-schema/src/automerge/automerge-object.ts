//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type AutomergeObjectCore } from './automerge-object-core';
import { type DocAccessor } from './automerge-types';
import { isValidKeyPath, type KeyPath } from './key-path';
import type * as echoHandlerModule from '../effect/echo-handler'; // Keep as type-only import.
import { getProxyHandlerSlot, isReactiveProxy } from '../effect/proxy';
import { type OpaqueEchoObject } from '../object';

export const getRawDoc = (obj: OpaqueEchoObject, path?: KeyPath): DocAccessor => {
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
