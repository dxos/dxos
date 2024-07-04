//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';

import type { ChangeFn, ChangeOptions, Doc, Heads } from '@dxos/automerge/automerge';
import { getProxyHandlerSlot, isReactiveObject } from '@dxos/echo-schema';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { isValidKeyPath, type KeyPath } from './key-path';
import { type ObjectCore } from './object-core';
import { getObjectCoreFromEchoTarget } from '../echo-handler/echo-handler';

//
// Automerge types.
// TODO(burdon): Factor out to new low-level type package: @dxos/types or to @dxos/automerge?
//

export interface IDocHandle<T = any> {
  docSync(): Doc<T> | undefined;
  change(callback: ChangeFn<T>, options?: ChangeOptions<T>): void;
  changeAt(heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): string[] | undefined;
  addListener(event: 'change', listener: () => void): void;
  removeListener(event: 'change', listener: () => void): void;
}

// TODO(burdon): Rename ValueAccessor?
export interface DocAccessor<T = any> {
  get handle(): IDocHandle<T>;
  get path(): KeyPath;
}

export const DocAccessor = {
  getValue: <T>(accessor: DocAccessor): T => get(accessor.handle.docSync(), accessor.path) as T,
};

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
