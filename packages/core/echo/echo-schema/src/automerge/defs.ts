//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';

import type { ChangeFn, ChangeOptions, Doc, Heads } from '@dxos/automerge/automerge';

import { getRawDoc } from './automerge-object';
import { type AutomergeTextCompat, type TextObject } from '../object';

//
// Automerge types.
// TODO(burdon): Factor out to new low-level type package: @dxos/types.
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
  get path(): string[];
}

export const DocAccessor = {
  getValue: <T>(accessor: DocAccessor): T => get(accessor.handle.docSync(), accessor.path) as T,
};

export const createDocAccessor = <T = any>(text: TextObject): DocAccessor<T> => {
  const obj = text as any as AutomergeTextCompat;
  return getRawDoc(obj, [obj.field]);
};
