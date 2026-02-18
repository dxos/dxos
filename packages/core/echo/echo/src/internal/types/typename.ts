//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';

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
 * Property name for parent when object is serialized to JSON.
 */
export const ATTR_PARENT = '@parent';

/**
 * Reference to the object parent.
 */
export const ParentId = Symbol.for('@dxos/echo/Parent');

/**
 * Returns the schema for the given object if one is defined.
 *
 * @internal (Use Obj.getSchema)
 */
// TODO(burdon): Narrow type.
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
