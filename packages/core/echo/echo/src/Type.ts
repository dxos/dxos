//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import type { EncodedReference } from '@dxos/echo-protocol';
import * as EchoSchema from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import type * as Keys from '@dxos/keys';

/**
 * ECHO schema.
 */
export type Schema = EchoSchema.EchoSchema;

/**
 * EchoObject schema.
 */
export const Obj = EchoSchema.EchoObject;

// TODO(buurdon): Move to Obj?
export namespace Obj {
  /**
   * Type that represents an arbitrary schema type of an object.
   * NOTE: This is not an instance type.
   */
  // TODO(dmaretskyi): If schema was covariant, we could specify props in here, like `id: ObjectId`.
  export type Any = Schema.Schema.AnyNoContext;
}

/**
 * EchoRelation schema.
 */
export const Relation = EchoSchema.EchoRelation;

// TODO(buurdon): Move to Relation?
export namespace Relation {
  /**
   * Type that represents an arbitrary schema type of a relation.
   * NOTE: This is not an instance type.
   */
  // TODO(dmaretskyi): If schema was covariant, we could specify props in here, like `id: ObjectId`.
  export type Any = Schema.Schema.AnyNoContext;

  /**
   * Get relation target type.
   */
  export type Target<A> = A extends EchoSchema.RelationSourceTargetRefs<infer T, infer _S> ? T : never;

  /**
   * Get relation source type.
   */
  export type Source<A> = A extends EchoSchema.RelationSourceTargetRefs<infer _T, infer S> ? S : never;
}

/**
 * Ref schema.
 */
export const Ref: <S extends Obj.Any>(schema: S) => EchoSchema.Ref$<Schema.Schema.Type<S>> = EchoSchema.Ref;

export interface Ref<T> extends Schema.SchemaClass<EchoSchema.Ref<T>, EncodedReference> {}

// TODO(buurdon): Move to Ref?
export namespace Ref {
  /**
   * Type that represents an arbitrary schema type of a reference.
   * NOTE: This is not an instance type.
   */
  export type Any = Schema.Schema<EchoSchema.Ref<any>, EncodedReference>;
}

/**
 * Gets the full DXN of the schema.
 * Will include the version if it's a `type` DXN.
 * @example "dxn:example.com/type/Person:0.1.0"
 * @example "dxn:echo:SSSSSSSSSS:XXXXXXXXXXXXX"
 */
export const getDXN = (schema: Obj.Any | Relation.Any): Keys.DXN | undefined => {
  return EchoSchema.getSchemaDXN(schema);
};

/**
 * @param schema - Schema to get the typename from.
 * @returns The typename of the schema. Example: `example.com/type/Person`.
 */
export const getTypename = (schema: Obj.Any | Relation.Any): string => {
  const typename = EchoSchema.getSchemaTypename(schema);
  invariant(typeof typename === 'string' && !typename.startsWith('dxn:'), 'Invalid typename');
  return typename;
};

/**
 * Gets the version of the schema.
 * @example 0.1.0
 */
export const getVersion = (schema: Obj.Any | Relation.Any): string => {
  const version = EchoSchema.getSchemaVersion(schema);
  invariant(typeof version === 'string' && version.match(/^\d+\.\d+\.\d+$/), 'Invalid version');
  return version;
};

/**
 * ECHO type metadata.
 */
export type Meta = EchoSchema.TypeAnnotation;

/**
 * Gets the meta data of the schema.
 */
export const getMeta = (schema: Obj.Any | Relation.Any): Meta | undefined => {
  return EchoSchema.getTypeAnnotation(schema);
};

export { EntityKind as Kind } from '@dxos/echo-schema';

/**
 * @returns True if the schema is mutable.
 */
export const isMutable = EchoSchema.isMutable;

export { SpaceId, ObjectId, DXN } from '@dxos/keys';

export {
  //
  Expando,
  Format,
  JsonSchemaType as JsonSchema,
  toEffectSchema,
  toJsonSchema,
} from '@dxos/echo-schema';
