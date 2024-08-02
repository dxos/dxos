//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';

import type { ChangeFn, ChangeOptions, Doc, Heads } from '@dxos/automerge/automerge';
import { type Reference } from '@dxos/echo-protocol';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { getProxyHandlerSlot, isReactiveObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { type ObjectCore } from './object-core';
import { getObjectCoreFromEchoTarget } from '../echo-handler';

/**
 * @deprecated Use DecodedAutomergePrimaryValue instead.
 */
export type DecodedAutomergeValue =
  | undefined
  | string
  | number
  | boolean
  | DecodedAutomergeValue[]
  | { [key: string]: DecodedAutomergeValue }
  | Reference
  | EchoReactiveObject<any>;

export type DecodedAutomergePrimaryValue =
  | undefined
  | string
  | number
  | boolean
  | DecodedAutomergePrimaryValue[]
  | { [key: string]: DecodedAutomergePrimaryValue }
  | Reference;

//
// Automerge types.
// TODO(burdon): Factor out to new low-level type package: @dxos/types or to @dxos/automerge?
//

export type KeyPath = readonly (string | number)[];

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

// TODO(burdon): Extract function.
export const DocAccessor = {
  getValue: <T>(accessor: DocAccessor): T => get(accessor.handle.docSync(), accessor.path) as T,
};

export const isValidKeyPath = (value: unknown): value is KeyPath =>
  Array.isArray(value) && value.every((v) => typeof v === 'string' || typeof v === 'number');

export const createDocAccessor = <T>(obj: EchoReactiveObject<T>, path: KeyPath): DocAccessor<T> => {
  invariant(isReactiveObject(obj));
  invariant(path === undefined || isValidKeyPath(path));

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const core = getObjectCoreFromEchoTarget(getProxyHandlerSlot(obj).target as any);
  return core.getDocAccessor(path);
};

export const getObjectCore = <T>(obj: EchoReactiveObject<T>): ObjectCore => {
  return getObjectCoreFromEchoTarget(getProxyHandlerSlot(obj).target as any);
};
