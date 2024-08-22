//
// Copyright 2023 DXOS.org
//

import { next as A } from '@dxos/automerge/automerge';
import { nonNullable } from '@dxos/util';

// Strings longer than this will have collaborative editing disabled for performance reasons.
const STRING_CRDT_LIMIT = 300_000;

/**
 * Encode model type to Automerge record.
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
        .filter(nonNullable),
    );
  }

  if (typeof value === 'string' && value.length > STRING_CRDT_LIMIT) {
    return new A.RawString(value);
  }

  return value;
};

/**
 * Encode Automerge record to model type.
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
 * Returns the relative path from the base path or return undefined if they dont' match.
 * Used to filter mutations.
 */
export const rebasePath = (path: A.Prop[], base: readonly (string | number)[]): A.Prop[] | undefined => {
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
 * Get value at path.
 */
export const getDeep = (obj: any, path: readonly (string | number)[], init = false) => {
  let value = obj;
  for (const key of path) {
    if (init) {
      value[key] ??= {};
    }
    value = value?.[key];
  }

  return value;
};
