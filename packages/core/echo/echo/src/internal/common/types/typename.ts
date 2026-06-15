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
 * Reference to the object's type entity (`Type.Obj`, `Type.Relation`, or
 * `Type.Type`). Set at instance creation by `createObject` / `makeObject`
 * when the entity is known. Public read-back via `Obj.getType` / `Relation.getType`
 * / `Entity.getType`.
 */
export const TypeEntityId = Symbol.for('@dxos/echo/TypeEntity');

/**
 * Returns the Effect Schema for the given object if one is defined.
 *
 * @internal
 * Internal callers needing schema-side validation read from `SchemaId`.
 * Public callers should use `Type.getSchema(Obj.getType(obj))` instead.
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
 * Returns the type entity (`Type.AnyEntity`) for the given instance.
 * Set at instance creation; every entity has a type. Defensive: returns
 * undefined for null/undefined input so callers can safely probe arbitrary
 * values via this helper.
 *
 * @internal Re-exported via `Obj.getType` / `Relation.getType` / `Entity.getType`.
 */
export const getType = (obj: unknown): unknown => {
  if (obj == null) {
    return undefined;
  }
  return (obj as any)[TypeEntityId];
};

/**
 * @internal
 */
export const setType = (obj: any, type: unknown): void => {
  Object.defineProperty(obj, TypeEntityId, {
    value: type,
    writable: false,
    enumerable: false,
    configurable: true,
  });
};
