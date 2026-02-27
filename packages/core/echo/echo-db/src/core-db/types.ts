//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Move this file to ../automerge.
// TDOO(burdon): Standardize import * as A.
import type { ChangeFn, ChangeOptions, Doc, Heads } from '@automerge/automerge';

import { type EncodedReference } from '@dxos/echo-protocol';
import { getDeep } from '@dxos/util';

/**
 * Values that can be encoded/decoded from Automerge documents.
 * Uses readonly modifiers so that both mutable and readonly types can be accepted.
 */
export type DecodedAutomergePrimaryValue =
  | undefined
  | string
  | number
  | boolean
  | readonly DecodedAutomergePrimaryValue[]
  | { readonly [key: string]: DecodedAutomergePrimaryValue }
  | EncodedReference;

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
  getValue: <T>(accessor: DocAccessor): T => getDeep(accessor.handle.doc(), accessor.path) as T,
};

export const isValidKeyPath = (value: unknown): value is KeyPath =>
  Array.isArray(value) && value.every((v) => typeof v === 'string' || typeof v === 'number');
