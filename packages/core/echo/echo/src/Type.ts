//
// Copyright 2025 DXOS.org
//

import type * as Schema$ from 'effect/Schema';

import { type EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';
import { type ToMutable } from '@dxos/util';

import type * as Entity$ from './Entity';
import {
  type ATTR_RELATION_SOURCE,
  type ATTR_RELATION_TARGET,
  EchoObjectSchema,
  EchoRelationSchema,
  type EchoRelationSchemaOptions,
  EchoSchema,
  EchoSchemaBrandSymbol,
  EntityKind,
  Expando as Expando$,
  type ExpandoEncoded,
  PersistentSchema,
  type PersistentSchemaEncoded,
  Ref as Ref$,
  type RefFn,
  type RefSchema,
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

// TODO(burdon): Remove toEffectSchema, toJsonSchema (moved to JsonSchema export).
export { toEffectSchema, toJsonSchema };

/**
 * Returns all properties of an object or relation except for the id and kind.
 */
export type Properties<T = any> = Omit<T, 'id' | Entity$.KindId | Relation$.Source | Relation$.Target>;

/**
 * Brand type that marks a schema as an ECHO schema.
 * The brand value indicates the entity kind (Object or Relation).
 */
type EchoSchemaBranded<K extends EntityKind = EntityKind> = {
  readonly [EchoSchemaBrandSymbol]: K;
};

/**
 * Base type for object schemas that both static schemas (created with Type.Obj())
 * and runtime schemas (EchoSchema) can satisfy.
 * Uses structural typing for the Schema parts to avoid AnnotableClass incompatibilities.
 */
type ObjectSchemaBase = Schema$.Schema.AnyNoContext &
  EchoSchemaBranded<EntityKind.Object> & {
    readonly typename: string;
    readonly version: string;
  };

/**
 * Base type for relation schemas that static schemas (created with Type.Relation()) can satisfy.
 */
type RelationSchemaBase = Schema$.Schema.AnyNoContext &
  EchoSchemaBranded<EntityKind.Relation> & {
    readonly typename: string;
    readonly version: string;
  };

//
// Obj
//

interface ObjJsonProps {
  id: string;
}

/**
 * Object schema.
 */
export const Obj: {
  (opts: TypeMeta): <Self extends Schema$.Schema.Any>(self: Self) => Obj.Of<Self>;
} = EchoObjectSchema as any;

/**
 * Object schema type definitions.
 */
export declare namespace Obj {
  /**
   * Type that represents an arbitrary schema type of an object.
   * NOTE: This is not an instance type.
   * Has brand to distinguish from relation schemas at compile time.
   * Uses structural typing to allow both static schemas (Type.Obj()) and runtime schemas (EchoSchema).
   */
  // TODO(dmaretskyi): If schema was covariant, we could specify props in here, like `id: ObjectId`.
  // TODO(burdon): This erases the ECHO type info (e.g., id, typename).
  export type Any = ObjectSchemaBase;

  /**
   * Branded object schema with preserved type parameter.
   * Full ECHO object schema type including AnnotableClass support for method chaining.
   */
  export interface Of<Self extends Schema$.Schema.Any>
    extends TypeMeta,
      EchoSchemaBranded<typeof Entity$.Kind.Object>,
      Schema$.AnnotableClass<
        Of<Self>,
        Entity$.OfKind<typeof Entity$.Kind.Object> & ToMutable<Schema$.Schema.Type<Self>>,
        Schema$.Simplify<ObjJsonProps & ToMutable<Schema$.Schema.Encoded<Self>>>,
        Schema$.Schema.Context<Self>
      > {}
}

//
// Expando
//

export const Expando: Obj.Of<Schema$.Schema<Expando$, ExpandoEncoded>> = Expando$ as any;
export type Expando = Obj.Of<Schema$.Schema<Expando$, ExpandoEncoded>>;

//
// Schema
//

export const PersistentType: Obj.Of<Schema$.Schema<PersistentSchema, PersistentSchemaEncoded>> = PersistentSchema as any;
export type PersistentType = Obj.Of<Schema$.Schema<PersistentSchema, PersistentSchemaEncoded>>;

export { EchoSchema as RuntimeType };

//
// Relation
//

interface RelationJsonProps {
  id: string;
  [ATTR_RELATION_SOURCE]: string;
  [ATTR_RELATION_TARGET]: string;
}

/**
 * Relation schema.
 */
// TODO(dmaretskyi): I have to redefine the type here so that the definition uses symbols from @dxos/echo/Relation.
// TODO(burdon): Remove?
export const Relation: {
  <Source extends Schema$.Schema.AnyNoContext, Target extends Schema$.Schema.AnyNoContext>(
    opts: EchoRelationSchemaOptions<Source, Target>,
  ): <Self extends Schema$.Schema.Any>(self: Self) => Relation.Of<Self, Source, Target>;
} = EchoRelationSchema as any;

/**
 * Relation schema type definitions.
 */
export namespace Relation {
  /**
   * Type that represents an arbitrary schema type of a relation.
   * NOTE: This is not an instance type.
   * Has brand to distinguish from object schemas at compile time.
   * Uses structural typing to allow both static schemas (Type.Relation()).
   */
  // TODO(dmaretskyi): If schema was covariant, we could specify props in here, like `id: ObjectId`.
  export type Any = RelationSchemaBase;

  /**
   * Branded relation schema with preserved type parameter.
   * Full ECHO relation schema type including AnnotableClass support for method chaining.
   */
  export interface Of<
    Self extends Schema$.Schema.Any,
    SourceSchema extends Schema$.Schema.Any = Schema$.Schema.Any,
    TargetSchema extends Schema$.Schema.Any = Schema$.Schema.Any,
  > extends TypeMeta,
      EchoSchemaBranded<typeof Entity$.Kind.Relation>,
      Schema$.AnnotableClass<
        Of<Self, SourceSchema, TargetSchema>,
        Entity$.OfKind<typeof Entity$.Kind.Relation> &
          Relation.Endpoints<Schema$.Schema.Type<SourceSchema>, Schema$.Schema.Type<TargetSchema>> &
          ToMutable<Schema$.Schema.Type<Self>>,
        Schema$.Simplify<RelationJsonProps & ToMutable<Schema$.Schema.Encoded<Self>>>,
        Schema$.Schema.Context<Self>
      > {}

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
// Entity
//

/**
 * Entity schema type definitions.
 */
export namespace Entity {
  /**
   * A schema that represents any entity type (object or relation).
   * Accepts:
   * - Static branded schemas created with Type.Obj() or Type.Relation()
   * - Mutable schemas (EchoSchema) from the database - these satisfy Obj.Any via the brand
   * Use this as a constraint for function parameters that accept any ECHO schema.
   */
  export type Any = Obj.Any | Relation.Any;

  /**
   * Branded entity schema (object or relation) with preserved type parameter.
   * Union type of Obj.Of<Self> or Relation.Of<Self>.
   */
  export type Of<Self extends Schema$.Schema.Any> = Obj.Of<Self> | Relation.Of<Self>;

  /**
   * Type guard to check if a schema is an object schema.
   * NOTE: This checks SCHEMAS, not instances. Use Obj.isObject for instances.
   */
  export const isObject = (schema: Entity.Any): schema is Obj.Any => {
    return schema[EchoSchemaBrandSymbol] === EntityKind.Object;
  };

  /**
   * Type guard to check if a schema is a relation schema.
   * NOTE: This checks SCHEMAS, not instances. Use Relation.isRelation for instances.
   */
  export const isRelation = (schema: Entity.Any): schema is Relation.Any => {
    return schema[EchoSchemaBrandSymbol] === EntityKind.Relation;
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
export interface ref<TargetSchema extends Schema$.Schema.Any> extends RefSchema<Schema$.Schema.Type<TargetSchema>> {}

/**
 * Ref schema.
 */
export const Ref: RefFn = Ref$;

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
export const getDXN = (schema: Entity.Any): DXN | undefined => {
  return getSchemaDXN(schema);
};

/**
 * @param schema - Schema to get the typename from.
 * @returns The typename of the schema. Example: `example.com/type/Person`.
 */
export const getTypename = (schema: Entity.Any): string => {
  const typename = getSchemaTypename(schema);
  invariant(typeof typename === 'string' && !typename.startsWith('dxn:'), 'Invalid typename');
  return typename;
};

/**
 * Gets the version of the schema.
 * @example 0.1.0
 */
export const getVersion = (schema: Entity.Any): string => {
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
export const getMeta = (schema: Entity.Any): Meta | undefined => {
  return getTypeAnnotation(schema);
};
