//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type BaseObject } from '../types';

export const ECHO_ATTR_TYPE = '@type';

/**
 * Querying the typename of the object.
 * The typename is either a DXN or a raw string without version.
 * @example `dxn:example.com/type/Contact:1.0.0`
 * @example `example.com/type/Contact`
 */
// TODO(dmaretskyi): Convert to be strictly a DXN.
export const TYPENAME_SYMBOL = Symbol.for('@dxos/schema/Typename');

/**
 * Gets the typename of the object without the version.
 */
// TODO(dmaretskyi): Convert to DXN.
export const getTypename = (obj: BaseObject): string | undefined => {
  let typename = (obj as any)[TYPENAME_SYMBOL];
  if (typename === undefined) {
    typename = obj[ECHO_ATTR_TYPE];
  }

  if (typename === undefined) {
    return undefined;
  }

  invariant(typeof typename === 'string');
  return typename;
};

export const setTypename = (obj: any, typename: string) => {
  Object.defineProperty(obj, TYPENAME_SYMBOL, {
    value: typename,
    writable: false,
    enumerable: false,
    configurable: false,
  });
};
