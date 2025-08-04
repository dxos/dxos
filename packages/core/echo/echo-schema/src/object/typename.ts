//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { getSchemaTypename } from '../ast';
import { type BaseObject } from '../types';

import { getSchema } from './accessors';
import { TypeId } from './model';

/**
 * Gets the typename of the object without the version.
 * Returns only the name portion, not the DXN.
 * @example "example.org/type/Contact"
 */
export const getTypename = (obj: BaseObject): string | undefined => {
  const schema = getSchema(obj);
  if (schema != null) {
    // Try to extract typename from DXN.
    return getSchemaTypename(schema);
  } else {
    const type = getType(obj);
    return type?.asTypeDXN()?.type;
  }
};

/**
 * @internal
 */
// TODO(dmaretskyi): Rename setTypeDXN.
export const setTypename = (obj: any, typename: DXN) => {
  invariant(typename instanceof DXN, 'Invalid type.');
  Object.defineProperty(obj, TypeId, {
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
  if (!obj) {
    return undefined;
  }

  const type = (obj as any)[TypeId];
  if (!type) {
    return undefined;
  }

  invariant(type instanceof DXN, 'Invalid object.');
  return type;
};
