//
// Copyright 2025 DXOS.org
//

import type * as EffectSchema from 'effect/Schema';

import { type EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import type * as Keys from '@dxos/keys';
import { type ToMutable } from '@dxos/util';

// TODO(dmaretskyi): Remove re-exports.
export { SpaceId, ObjectId, DXN } from '@dxos/keys';

import * as EchoSchema from './EchoSchema';
import type * as RelationModule from './Relation';

export { Format, JsonSchemaType as JsonSchema, toEffectSchema, toJsonSchema } from './EchoSchema';

//
// Kind
//

export const KindId: unique symbol = EchoSchema.EntityKindId as any;
export type KindId = typeof KindId;

export const Kind = EchoSchema.EntityKind;

/**
 * Assigns a kind to an Object or Relation instance.
 */
// NOTE: Needed to make `isRelation` and `isObject` checks work.
export interface OfKind<Kind extends EchoSchema.EntityKind> {
  readonly id: Keys.ObjectId;
  readonly [KindId]: Kind;
}

/**
 * Base ECHO schema type.
 */
export type Schema = EchoSchema.EchoSchema;

/**
 * Returns all properties of an object or relation except for the id and kind.
 */
export type Properties<T = any> = Omit<T, 'id' | KindId | RelationModule.Source | RelationModule.Target>;

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
export interface obj<Self extends EffectSchema.Schema.Any>
  extends EchoSchema.TypeMeta,
    EffectSchema.AnnotableClass<
      obj<Self>,
      OfKind<EchoSchema.EntityKind.Object> & ToMutable<EffectSchema.Schema.Type<Self>>,
      EffectSchema.Simplify<ObjJsonProps & ToMutable<EffectSchema.Schema.Encoded<Self>>>,
      EffectSchema.Schema.Context<Self>
    > {}

/**
 * Object schema.
 */
export const Obj: {
  (opts: EchoSchema.TypeMeta): <Self extends EffectSchema.Schema.Any>(self: Self) => obj<Self>;
} = EchoSchema.EchoObject as any;

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
  export type Any = EffectSchema.Schema.AnyNoContext;
}

//
// Expando
//

// TODO(burdon): We're using Expando in many places as a base type.
export interface Expando extends OfKind<EchoSchema.EntityKind.Object> {
  [key: string]: any;
}

type ExpandoEncoded = EffectSchema.Simplify<ObjJsonProps & { [key: string]: any }>;

export const Expando: EffectSchema.Schema<Expando, ExpandoEncoded, never> = EchoSchema.Expando as any;

//
// Relation
//

interface RelationJsonProps {
  id: string;
  [EchoSchema.ATTR_RELATION_SOURCE]: string;
  [EchoSchema.ATTR_RELATION_TARGET]: string;
}

/**
 * Return type of the `Relation` schema constructor.
 *
 * This typedef avoids `TS4023` error (name from external module cannot be used named).
 * See Effect's note on interface types.
 */
export interface relation<
  Self extends EffectSchema.Schema.Any,
  SourceSchema extends EffectSchema.Schema.Any,
  TargetSchema extends EffectSchema.Schema.Any,
> extends EchoSchema.TypeMeta,
    EffectSchema.AnnotableClass<
      relation<Self, SourceSchema, TargetSchema>,
      OfKind<EchoSchema.EntityKind.Relation> &
        Relation.Endpoints<EffectSchema.Schema.Type<SourceSchema>, EffectSchema.Schema.Type<TargetSchema>> &
        ToMutable<EffectSchema.Schema.Type<Self>>,
      EffectSchema.Simplify<RelationJsonProps & ToMutable<EffectSchema.Schema.Encoded<Self>>>,
      EffectSchema.Schema.Context<Self>
    > {}

/**
 * Relation schema.
 */
// TODO(dmaretskyi): I have to redefine the type here so that the definition uses symbols from @dxos/echo/Relation.
export const Relation: {
  <Source extends EffectSchema.Schema.AnyNoContext, Target extends EffectSchema.Schema.AnyNoContext>(
    opts: EchoSchema.EchoRelationOptions<Source, Target>,
  ): <Self extends EffectSchema.Schema.Any>(self: Self) => relation<Self, Source, Target>;
} = EchoSchema.EchoRelation as any;

/**
 * Relation schema type definitions.
 */
export namespace Relation {
  /**
   * Type that represents an arbitrary schema type of a relation.
   * NOTE: This is not an instance type.
   */
  // TODO(dmaretskyi): If schema was covariant, we could specify props in here, like `id: ObjectId`.
  export type Any = EffectSchema.Schema.AnyNoContext;

  /**
   * Get relation source type.
   */
  export type Source<A> = A extends Relation.Endpoints<infer S, infer _T> ? S : never;

  /**
   * Get relation target type.
   */
  export type Target<A> = A extends Relation.Endpoints<infer _S, infer T> ? T : never;

  export type Endpoints<Source, Target> = {
    [RelationModule.Source]: Source;
    [RelationModule.Target]: Target;
  };
}

//
// Ref
//

/**
 * Return type of the `Ref` schema constructor.
 *
 * This typedef avoids `TS4023` error (name from external module cannot be used named).
 * See Effect's note on interface types.
 */
export interface ref<TargetSchema extends EffectSchema.Schema.Any>
  extends EchoSchema.Ref$<EffectSchema.Schema.Type<TargetSchema>> {}

/**
 * Ref schema.
 */
export const Ref: <S extends Obj.Any>(schema: S) => ref<S> = EchoSchema.Ref;

export interface Ref<T> extends EffectSchema.SchemaClass<EchoSchema.Ref<T>, EncodedReference> {}

// TODO(buurdon): Move to Ref?
export namespace Ref {
  /**
   * Type that represents an arbitrary schema type of a reference.
   * NOTE: This is not an instance type.
   */
  export type Any = EffectSchema.Schema<EchoSchema.Ref<any>, EncodedReference>;
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
 * @returns True if the schema is mutable.
 */
export const isMutable = EchoSchema.isMutable;

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
