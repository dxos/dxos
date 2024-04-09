//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';

import type { ChangeFn, ChangeOptions, Doc, Heads } from '@dxos/automerge/automerge';

import { getRawDoc } from './automerge-object';
import { type KeyPath } from './key-path';
import { type EchoReactiveObject } from '../effect/reactive';
import { type AutomergeTextCompat, type TextObject } from '../object';

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

// TODO(burdon): Remove?
export const createDocAccessor = <T = any>(
  text: TextObject | EchoReactiveObject<{ content: string }>,
): DocAccessor<T> => {
  const obj = text as any as AutomergeTextCompat;
  // TODO(dmaretskyi): I don't think `obj.field` is a thing anymore, can we remove it?
  return getRawDoc(obj, [obj.field ?? 'content']);
};
