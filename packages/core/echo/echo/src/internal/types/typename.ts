//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { getSchemaTypename } from '../annotations';

import { type AnyProperties } from './base';

/**
 * Property name for typename when object is serialized to JSON.
 */
export const ATTR_TYPE = '@type';

/**
 * DXN to the object type.
 */
export const TypeId = Symbol.for('@dxos/echo/Type');

/**
 * Reference to the object schema.
 */
export const SchemaId = Symbol.for('@dxos/echo/Schema');

/**
 * Returns the schema for the given object if one is defined.
 *
 * @internal (Use Obj.getSchema)
 */
// TODO(dmaretskyi): For echo objects, this always returns the root schema.
export const getSchema = (obj: unknown | undefined): Schema.Schema.AnyNoContext | undefined => {
  if (obj) {
    return (obj as any)[SchemaId];
  }
};

/**
 * @internal
 */
export const setSchema = (obj: any, schema: Schema.Schema.AnyNoContext): void => {
  Object.defineProperty(obj, SchemaId, {
    value: schema,
    writable: false,
    enumerable: false,
    configurable: false,
  });
};

/**
 * Gets the typename of the object without the version.
 * Returns only the name portion, not the DXN.
 * @example "example.org/type/Contact"
 *
 * @internal (use Obj.getTypename)
 */
export const getTypename = (obj: AnyProperties): string | undefined => {
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
 * @internal (use Type.setTypename)
 */
// TODO(dmaretskyi): Rename setTypeDXN.
export const setTypename = (obj: any, typename: DXN): void => {
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
 * @example `dxn:example.com/type/Person:1.0.0`
 *
 * @internal (use Obj.getTypeDXN)
 */
export const getType = (obj: AnyProperties): DXN | undefined => {
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
