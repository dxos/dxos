//
// Copyright 2023 DXOS.org
//

import { next as A } from '@dxos/automerge/automerge';
import { nonNullable } from '@dxos/util';

// Strings longer than this will have collaborative editing disabled for performance reasons.
const STRING_CRDT_LIMIT = 300_000;

// TODO(burdon): Move to utils.
export const throttle = <T>(f: (arg: T) => void, t: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (arg: T) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => f(arg), t);
  };
};

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
          // TODO(burdon): Configure.
          if (key === 'versionNonce' || key === 'updated') {
            return undefined;
          }

          // TODO(burdon): Just skip undefined?
          return [key, encode(value) ?? null];
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

// TODO(burdon): AM Utils.

/**
 *
 */
// TODO(burdon): Comment.
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
