//
// Copyright 2025 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { isNonNullable } from '@dxos/util';

import * as Doc from './Doc';

// Strings longer than this have collaborative editing disabled for performance reasons.
const STRING_CRDT_LIMIT = 300_000;

/**
 * Default codec: encode a model value to an Automerge record.
 */
export const encode = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(encode);
  }
  if (value instanceof A.RawString) {
    throw new Error('Encode called on automerge data.');
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, value]) => {
          const encoded = encode(value);
          if (encoded === undefined) {
            return undefined;
          }
          return [key, value];
        })
        .filter(isNonNullable),
    );
  }
  if (typeof value === 'string' && value.length > STRING_CRDT_LIMIT) {
    return new A.RawString(value);
  }

  return value;
};

/**
 * Default codec: decode an Automerge record to a model value.
 */
export const decode = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(decode);
  }
  if (value instanceof A.RawString) {
    return value.toString();
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, decode(value)]));
  }

  return value;
};

/**
 * Relative path from `base`, or `undefined` if `path` is not under `base`. Used to filter mutations.
 */
export const rebasePath = (path: A.Prop[], base: Doc.KeyPath): A.Prop[] | undefined => {
  if (path.length < base.length) {
    return undefined;
  }
  for (let i = 0; i < base.length; ++i) {
    if (path[i] !== base[i]) {
      return undefined;
    }
  }

  return path.slice(base.length);
};

/**
 * Read the value at `path`. When `init` is set, auto-vivifies intermediate records.
 */
export const getDeep = (obj: any, path: Doc.KeyPath, init = false): any => {
  let value = obj;
  for (const key of path) {
    if (init) {
      value[key] ??= {};
    }
    value = value?.[key];
  }

  return value;
};
