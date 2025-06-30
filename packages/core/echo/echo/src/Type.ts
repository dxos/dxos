//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';
import type { Simplify } from 'effect/Schema';

import type { EncodedReference } from '@dxos/echo-protocol';
import * as EchoSchema from '@dxos/echo-schema';
import type { ToMutable } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import type * as Keys from '@dxos/keys';

import type * as RelationModule from './Relation';

export const KindId: unique symbol = EchoSchema.EntityKindId as any;
export type KindId = typeof KindId;

export { EntityKind as Kind } from '@dxos/echo-schema';

/**
 * Assigns a kind to an Object or Relation instance.
 */
// NOTE: Needed to make `isRelation` and `isObject` checks work.
export interface OfKind<Kind extends EchoSchema.EntityKind> {
  readonly id: Keys.ObjectId;
  readonly [KindId]: Kind;
}

interface ObjJsonProps {
  id: string;
}

interface RelationJsonProps {
  id: string;
  [EchoSchema.ATTR_RELATION_SOURCE]: string;
  [EchoSchema.ATTR_RELATION_TARGET]: string;
}

/**
 * Returns all properties of an object or relation except for the id and kind.
 */
export type Properties<T> = Omit<T, 'id' | KindId | RelationModule.Source | RelationModule.Target>;

/**
 * Base ECHO schema type.
 */
export type Schema = EchoSchema.EchoSchema;

/**
 * Return type of the `Obj` schema constructor.
 *
 * This typedef avoids `TS4023` error (name from external module cannot be used named).
 * See Effect's note on interface types.
 */
export interface obj<Self extends Schema.Schema.Any>
  extends Schema.AnnotableClass<
      obj<Self>,
      OfKind<EchoSchema.EntityKind.Object> & ToMutable<Schema.Schema.Type<Self>>,
      Simplify<ObjJsonProps & ToMutable<Schema.Schema.Encoded<Self>>>,
      Schema.Schema.Context<Self>
    >,
    EchoSchema.TypeMeta {}

/**
 * Object schema.
 */
export const Obj: {
  (opts: EchoSchema.TypeMeta): <Self extends Schema.Schema.Any>(self: Self) => obj<Self>;
} = EchoSchema.EchoObject as any;

/**
 * Object schema type definitions.
 */
export namespace Obj {
  /**
   * Type that represents an arbitrary schema type of an object.
   * NOTE: This is not an instance type.
   */
  // TODO(dmaretskyi): If schema was covariant, we could specify props in here, like `id: ObjectId`.
  export type Any = Schema.Schema.AnyNoContext;
}

/**
 * Return type of the `Relation` schema constructor.
 *
 * This typedef avoids `TS4023` error (name from external module cannot be used named).
 * See Effect's note on interface types.
 */
export interface relation<
  Self extends Schema.Schema.Any,
  SourceSchema extends Schema.Schema.Any,
  TargetSchema extends Schema.Schema.Any,
> extends Schema.AnnotableClass<
      relation<Self, SourceSchema, TargetSchema>,
      OfKind<EchoSchema.EntityKind.Relation> &
        Relation.Endpoints<Schema.Schema.Type<SourceSchema>, Schema.Schema.Type<TargetSchema>> &
        ToMutable<Schema.Schema.Type<Self>>,
      Simplify<RelationJsonProps & ToMutable<Schema.Schema.Encoded<Self>>>,
      Schema.Schema.Context<Self>
    >,
    EchoSchema.TypeMeta {}

/**
 * Relation schema.
 */
// TODO(dmaretskyi): I have to redefine the type here so that the definition uses symbols from @dxos/echo/Relation.
export const Relation: {
  <Source extends Schema.Schema.AnyNoContext, Target extends Schema.Schema.AnyNoContext>(
    opts: EchoSchema.EchoRelationOptions<Source, Target>,
  ): <Self extends Schema.Schema.Any>(self: Self) => relation<Self, Source, Target>;
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
  export type Any = Schema.Schema.AnyNoContext;

  /**
   * Get relation target type.
   */
  export type Target<A> = A extends Relation.Endpoints<infer _S, infer T> ? T : never;

  /**
   * Get relation source type.
   */
  export type Source<A> = A extends Relation.Endpoints<infer S, infer _T> ? S : never;

  export type Endpoints<Source, Target> = {
    [RelationModule.Source]: Source;
    [RelationModule.Target]: Target;
  };
}

/**
 * Return type of the `Ref` schema constructor.
 *
 * This typedef avoids `TS4023` error (name from external module cannot be used named).
 * See Effect's note on interface types.
 */
export interface ref<TargetSchema extends Schema.Schema.Any>
  extends EchoSchema.Ref$<Schema.Schema.Type<TargetSchema>> {}

/**
 * Ref schema.
 */
export const Ref: <S extends Obj.Any>(schema: S) => ref<S> = EchoSchema.Ref;

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

/**
 * @returns True if the schema is mutable.
 */
export const isMutable = EchoSchema.isMutable;

export { SpaceId, ObjectId, DXN } from '@dxos/keys';

export interface Expando extends OfKind<EchoSchema.EntityKind.Object> {
  [key: string]: any;
}

export const Expando: Schema.Schema<
  Expando,
  Simplify<ObjJsonProps & { [key: string]: any }>,
  never
> = EchoSchema.Expando as any;

export {
  // TODO(burdon): Standardize.
  Format,
  JsonSchemaType as JsonSchema,
  toEffectSchema,
  toJsonSchema,
} from '@dxos/echo-schema';
