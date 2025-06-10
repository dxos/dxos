//
// Copyright 2023 DXOS.org
//

import type { ChangeFn, ChangeOptions, Doc, Heads } from '@automerge/automerge';

import { type Reference } from '@dxos/echo-protocol';
import { type BaseObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { isLiveObject, type Live } from '@dxos/live-object';
import { get } from '@dxos/util';

import { type AnyLiveObject, getObjectCore } from '../echo-handler';
import { symbolPath, type ProxyTarget } from '../echo-handler/echo-proxy-target';

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
  | AnyLiveObject<any>;

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
// TODO(burdon): Factor out to new low-level type package: @dxos/types?
//

export type KeyPath = readonly (string | number)[];

export interface IDocHandle<T = any> {
  doc(): Doc<T> | undefined;
  change(callback: ChangeFn<T>, options?: ChangeOptions<T>): void;
  changeAt(heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): Heads | undefined;
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
  getValue: <T>(accessor: DocAccessor): T => get(accessor.handle.doc(), accessor.path) as T,
};

export const isValidKeyPath = (value: unknown): value is KeyPath =>
  Array.isArray(value) && value.every((v) => typeof v === 'string' || typeof v === 'number');

// TODO(burdon): Move to @dxos/live-object?
export const createDocAccessor = <T extends BaseObject>(obj: Live<T>, path: KeyPath | keyof T): DocAccessor<T> => {
  if (!Array.isArray(path)) {
    path = [path as any];
  }

  invariant(isLiveObject(obj));
  invariant(path === undefined || isValidKeyPath(path));
  const core = getObjectCore(obj);
  const basePath = (obj as any as ProxyTarget)[symbolPath];
  const fullPath = basePath ? [...basePath, ...path] : path;
  return core.getDocAccessor(fullPath);
};
