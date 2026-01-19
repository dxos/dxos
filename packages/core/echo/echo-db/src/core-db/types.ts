//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Move this file to ../automerge.
// TDOO(burdon): Standardize import * as A.
import type { ChangeFn, ChangeOptions, Doc, Heads } from '@automerge/automerge';

import { type DXN } from '@dxos/keys';
import { get } from '@dxos/util';

export type DecodedAutomergePrimaryValue =
  | undefined
  | string
  | number
  | boolean
  | DecodedAutomergePrimaryValue[]
  | { [key: string]: DecodedAutomergePrimaryValue }
  | DXN;

//
// Automerge types.
// TODO(burdon): Factor out to new low-level type package: @dxos/types?
//

export type KeyPath = readonly (string | number)[];

export interface IDocHandle<T = any> {
  doc(): Doc<T> | undefined; // TODO(burdon): Remove undefined.
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
