import { invariant } from '@dxos/invariant';
import { type BaseObject } from '../types';
export const ECHO_ATTR_TYPE = '@type';

/**
 * Querying the typename of the object.
 * The typename is the raw string without version: `example.com/type/Contact`.
 */
// TODO(dmaretskyi): Convert to DXN.
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
  invariant(!typename.startsWith('dxn:'));
  invariant(!typename.includes('@'));
  return typename;
};
