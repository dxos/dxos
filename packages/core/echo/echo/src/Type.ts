//
// Copyright 2025 DXOS.org
//

import type * as Schema$ from 'effect/Schema';

import { type EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';
import { type ToMutable } from '@dxos/util';

import {
  type ATTR_RELATION_SOURCE,
  type ATTR_RELATION_TARGET,
  EchoObjectSchema,
  EchoRelationSchema,
  type EchoRelationSchemaOptions,
  type EchoSchema,
  EntityKind,
  Expando as Expando$,
  KindId,
  type OfKind,
  Ref as Ref$,
  type TypeAnnotation,
  type TypeMeta,
  getSchemaDXN,
  getSchemaTypename,
  getSchemaVersion,
  getTypeAnnotation,
  isMutable as isMutable$,
  toEffectSchema,
  toJsonSchema,
} from './internal';
import type * as Relation$ from './Relation';

export { KindId, OfKind, toEffectSchema, toJsonSchema };

//
// Kind
//

export const Kind = EntityKind;

/**
 * Base ECHO schema type.
 */
export type Schema = EchoSchema;

/**
 * Returns all properties of an object or relation except for the id and kind.
 */
export type Properties<T = any> = Omit<T, 'id' | KindId | Relation$.Source | Relation$.Target>;

//
// Obj
//

interface ObjJsonProps {
  id: string;
}

/**
 * Return type of the `Obj` schema constructor.
 *
 * This typedef avoids `TS4023` error (name from external module cannot be used named).
 * See Effect's note on interface types.
 */
export interface obj<Self extends Schema$.Schema.Any>
  extends TypeMeta,
    Schema$.AnnotableClass<
      obj<Self>,
      OfKind<EntityKind.Object> & ToMutable<Schema$.Schema.Type<Self>>,
      Schema$.Simplify<ObjJsonProps & ToMutable<Schema$.Schema.Encoded<Self>>>,
      Schema$.Schema.Context<Self>
    > {}

/**
 * Object schema.
 */
export const Obj: {
  (opts: TypeMeta): <Self extends Schema$.Schema.Any>(self: Self) => obj<Self>;
} = EchoObjectSchema as any;

/**
 * Object schema type definitions.
 */
export declare namespace Obj {
  /**
   * Type that represents an arbitrary schema type of an object.
   * NOTE: This is not an instance type.
   */
  // TODO(dmaretskyi): If schema was covariant, we could specify props in here, like `id: ObjectId`.
  // TODO(burdon): This erases the ECHO type info (e.g., id, typename).
  export type Any = Schema$.Schema.AnyNoContext;
}

//
// Expando
//

// TODO(burdon): We're using Expando in many places as a base type.
export interface Expando extends OfKind<EntityKind.Object> {
  [key: string]: any;
}

type ExpandoEncoded = Schema$.Simplify<ObjJsonProps & { [key: string]: any }>;

export const Expando: Schema$.Schema<Expando, ExpandoEncoded, never> = Expando$ as any;

//
// Relation
//

interface RelationJsonProps {
  id: string;
  [ATTR_RELATION_SOURCE]: string;
  [ATTR_RELATION_TARGET]: string;
}

/**
 * Return type of the `Relation` schema constructor.
 *
 * This typedef avoids `TS4023` error (name from external module cannot be used named).
 * See Effect's note on interface types.
 */
export interface relation<
  Self extends Schema$.Schema.Any,
  SourceSchema extends Schema$.Schema.Any,
  TargetSchema extends Schema$.Schema.Any,
> extends TypeMeta,
    Schema$.AnnotableClass<
      relation<Self, SourceSchema, TargetSchema>,
      OfKind<EntityKind.Relation> &
        Relation.Endpoints<Schema$.Schema.Type<SourceSchema>, Schema$.Schema.Type<TargetSchema>> &
        ToMutable<Schema$.Schema.Type<Self>>,
      Schema$.Simplify<RelationJsonProps & ToMutable<Schema$.Schema.Encoded<Self>>>,
      Schema$.Schema.Context<Self>
    > {}

/**
 * Relation schema.
 */
// TODO(dmaretskyi): I have to redefine the type here so that the definition uses symbols from @dxos/echo/Relation.
export const Relation: {
  <Source extends Schema$.Schema.AnyNoContext, Target extends Schema$.Schema.AnyNoContext>(
    opts: EchoRelationSchemaOptions<Source, Target>,
  ): <Self extends Schema$.Schema.Any>(self: Self) => relation<Self, Source, Target>;
} = EchoRelationSchema as any;

/**
 * Relation schema type definitions.
 */
export namespace Relation {
  /**
   * Type that represents an arbitrary schema type of a relation.
   * NOTE: This is not an instance type.
   */
  // TODO(dmaretskyi): If schema was covariant, we could specify props in here, like `id: ObjectId`.
  export type Any = Schema$.Schema.AnyNoContext;

  /**
   * Get relation source type.
   */
  export type Source<A> = A extends Relation.Endpoints<infer S, infer _T> ? S : never;

  /**
   * Get relation target type.
   */
  export type Target<A> = A extends Relation.Endpoints<infer _S, infer T> ? T : never;

  export type Endpoints<Source, Target> = {
    [Relation$.Source]: Source;
    [Relation$.Target]: Target;
  };
}

//
// Ref
// TODO(burdon): Reconcile Type.Ref with Ref.Ref.
//

/**
 * Return type of the `Ref` schema constructor.
 *
 * This typedef avoids `TS4023` error (name from external module cannot be used named).
 * See Effect's note on interface types.
 */
export interface ref<TargetSchema extends Schema$.Schema.Any> extends Ref$<Schema$.Schema.Type<TargetSchema>> {}

/**
 * Ref schema.
 */
export const Ref = Ref$;

export interface Ref<T> extends Schema$.SchemaClass<Ref$<T>, EncodedReference> {}

export namespace Ref {
  /**
   * Type that represents an arbitrary schema type of a reference.
   * NOTE: This is not an instance type.
   */
  export type Any = Schema$.Schema<Ref$<any>, EncodedReference>;
}

/**
 * Gets the full DXN of the schema.
 * Will include the version if it's a `type` DXN.
 * @example "dxn:example.com/type/Person:0.1.0"
 * @example "dxn:echo:SSSSSSSSSS:XXXXXXXXXXXXX"
 */
export const getDXN = (schema: Obj.Any | Relation.Any): DXN | undefined => {
  return getSchemaDXN(schema);
};

/**
 * @param schema - Schema to get the typename from.
 * @returns The typename of the schema. Example: `example.com/type/Person`.
 */
export const getTypename = (schema: Obj.Any | Relation.Any): string => {
  const typename = getSchemaTypename(schema);
  invariant(typeof typename === 'string' && !typename.startsWith('dxn:'), 'Invalid typename');
  return typename;
};

/**
 * Gets the version of the schema.
 * @example 0.1.0
 */
export const getVersion = (schema: Obj.Any | Relation.Any): string => {
  const version = getSchemaVersion(schema);
  invariant(typeof version === 'string' && version.match(/^\d+\.\d+\.\d+$/), 'Invalid version');
  return version;
};

/**
 * @returns True if the schema is mutable.
 */
export const isMutable = isMutable$;

/**
 * ECHO type metadata.
 */
export type Meta = TypeAnnotation;

/**
 * Gets the meta data of the schema.
 */
export const getMeta = (schema: Obj.Any | Relation.Any): Meta | undefined => {
  return getTypeAnnotation(schema);
};
