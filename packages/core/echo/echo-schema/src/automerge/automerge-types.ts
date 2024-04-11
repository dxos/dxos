//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';

import type { ChangeFn, ChangeOptions, Doc, Heads } from '@dxos/automerge/automerge';

import { getRawDoc } from './automerge-object';
import { type KeyPath } from './key-path';
import { type EchoReactiveObject } from '../effect/reactive';

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

/**
 * @deprecated
 */
// TODO(burdon): Delete.
export const createDocAccessor = <T = any>(
  text: EchoReactiveObject<{ content: string; field?: string }>,
): DocAccessor<T> => {
  // TODO(dmaretskyi): I don't think `obj.field` is a thing anymore, can we remove it?
  return getRawDoc(text, [text.field ?? 'content']);
};
