//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { type BaseObject } from '../types';

// TODO(burdon): Change to `@typename`.
export const ECHO_ATTR_TYPE = '@type';

/**
 * Querying the typename of the object.
 * The typename is either a DXN or a raw string without version.
 * @example `dxn:example.com/type/Contact:1.0.0`
 * @example `example.com/type/Contact`
 */
// TODO(dmaretskyi): Unify with {@link TypeSymbol}.
export const TYPENAME_SYMBOL = Symbol.for('@dxos/schema/Typename');

/**
 * Querying the type of the object.
 * The type returned is a DXN.
 * @example dxn:example.com/type/Contact:1.0.0
 */
export const TypeSymbol = Symbol.for('@dxos/schema/Type');

/**
 * Gets the typename of the object without the version.
*/
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

/**
 * @internal
 */
export const setTypename = (obj: any, typename: string) => {
  Object.defineProperty(obj, TYPENAME_SYMBOL, {
    value: typename,
    writable: false,
    enumerable: false,
    configurable: false,
  });
};

/**
 * @returns Object type as {@link DXN}.
 * @returns undefined if the object doesn't have a type.
 * @example `dxn:example.com/type/Contact:1.0.0`
 */
export const getType = (obj: BaseObject): DXN | undefined => {
  if (obj) {
    const type = (obj as any)[TypeSymbol];
    if (type) {
      return type;
    }

    const typename = (obj as any)[TYPENAME_SYMBOL];
    if (typeof typename === 'string' && typename.startsWith('dxn:')) {
      return DXN.parse(typename);
    }
  }

  return undefined;
};
