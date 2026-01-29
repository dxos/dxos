//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type DXN, type ObjectId } from '@dxos/keys';
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
  PersistentSchema,
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

//
// Internal types (not exported)
//

/**
 * Brand type that marks a schema as an ECHO schema.
 * The brand value indicates the entity kind (Object or Relation).
 */
type EchoSchemaBranded<K extends EntityKind = EntityKind> = {
  readonly [EchoSchemaBrandSymbol]: K;
};

/**
 * JSON-encoded properties for objects.
 */
interface ObjJsonProps {
  id: string;
}

/**
 * JSON-encoded properties for relations.
 */
interface RelationJsonProps {
  id: string;
  [ATTR_RELATION_SOURCE]: string;
  [ATTR_RELATION_TARGET]: string;
}

//
// Runtime schema for any ECHO object
//

/**
 * Runtime Effect schema that validates any ECHO object.
 * An ECHO object has an `id` field and can have any additional properties.
 */
const AnyObjectSchema = Schema.Struct({
  id: Schema.String,
}).pipe(Schema.extend(Schema.Record({ key: Schema.String, value: Schema.Unknown }))) as Schema.Schema<
  { id: ObjectId } & Record<string, unknown>,
  { id: string } & Record<string, unknown>
>;

//
// Obj - Object schema types and factory
//

/**
 * Runtime Effect schema for any ECHO object.
 * Use for validation, parsing, or type guards on unknown values.
 *
 * @example
 * ```ts
 * if (Schema.is(Type.Obj)(unknownValue)) {
 *   // unknownValue is an ECHO object
 * }
 * ```
 */
export const Obj: Schema.Schema<{ id: ObjectId } & Record<string, unknown>, { id: string } & Record<string, unknown>> =
  AnyObjectSchema;

/**
 * TypeScript type for an ECHO object schema.
 * `T` is the instance type produced by the schema.
 *
 * @example
 * ```ts
 * const PersonSchema: Type.Obj<Person> = Schema.Struct({
 *   name: Schema.String,
 * }).pipe(Type.object({ typename: 'Person', version: '0.1.0' }));
 * ```
 */
export interface Obj<T = any>
  extends TypeMeta,
    EchoSchemaBranded<EntityKind.Object>,
    Schema.AnnotableClass<
      Obj<T>,
      Entity$.OfKind<typeof Entity$.Kind.Object> & T,
      Schema.Simplify<ObjJsonProps & ToMutable<T>>,
      never
    > {}

/**
 * Structural base type for any ECHO object schema.
 * Accepts both static schemas (created with Type.object()) and EchoSchema.
 * NOTE: Does not include the brand symbol to avoid TS4053 declaration portability issues.
 * Use Type.Entity.isObject() for runtime type guards.
 */
type ObjectSchemaBase = Schema.Schema.AnyNoContext & {
  readonly typename: string;
  readonly version: string;
};

export namespace Obj {
  /**
   * Type that represents any ECHO object schema.
   * Accepts both static schemas (Type.object()) and mutable schemas (EchoSchema).
   */
  export type Any = ObjectSchemaBase;
}

/**
 * Factory function to create an ECHO object schema.
 * Adds object metadata annotations to an Effect schema.
 *
 * @example
 * ```ts
 * const Person = Schema.Struct({
 *   name: Schema.String,
 * }).pipe(Type.object({ typename: 'example.com/type/Person', version: '0.1.0' }));
 * ```
 */
export const object: {
  (opts: TypeMeta): <Self extends Schema.Schema.Any>(self: Self) => Obj<Schema.Schema.Type<Self>>;
} = EchoObjectSchema as any;

//
// Expando
//

export const Expando: Obj<Expando$> = Expando$ as any;
export type Expando = Obj<Expando$>;

//
// PersistentType (Schema stored in database)
//

export const PersistentType: Obj<PersistentSchema> = PersistentSchema as any;
export type PersistentType = Obj<PersistentSchema>;

export { EchoSchema as RuntimeType };

//
// Runtime schema for any ECHO relation
//

/**
 * Runtime Effect schema that validates any ECHO relation.
 * A relation has `id`, source, and target fields plus any additional properties.
 */
const AnyRelationSchema = Schema.Struct({
  id: Schema.String,
}).pipe(Schema.extend(Schema.Record({ key: Schema.String, value: Schema.Unknown }))) as Schema.Schema<
  { id: ObjectId } & Record<string, unknown>,
  { id: string } & Record<string, unknown>
>;

//
// Relation - Relation schema types and factory
//

/**
 * Runtime Effect schema for any ECHO relation.
 * Use for validation, parsing, or type guards on unknown values.
 */
export const Relation: Schema.Schema<
  { id: ObjectId } & Record<string, unknown>,
  { id: string } & Record<string, unknown>
> = AnyRelationSchema;

/**
 * TypeScript type for an ECHO relation schema.
 * `T` is the instance type produced by the schema (excluding source/target).
 * `Source` and `Target` are the endpoint types.
 */
export interface Relation<T = any, Source = any, Target = any>
  extends TypeMeta,
    EchoSchemaBranded<EntityKind.Relation>,
    Schema.AnnotableClass<
      Relation<T, Source, Target>,
      Entity$.OfKind<typeof Entity$.Kind.Relation> & Relation.Endpoints<Source, Target> & T,
      Schema.Simplify<RelationJsonProps & ToMutable<T>>,
      never
    > {}

/**
 * Structural base type for any ECHO relation schema.
 * Accepts static schemas (created with Type.relation()).
 * NOTE: Does not include the brand symbol to avoid TS4053 declaration portability issues.
 * Use Type.Entity.isRelation() for runtime type guards.
 */
type RelationSchemaBase = Schema.Schema.AnyNoContext & {
  readonly typename: string;
  readonly version: string;
};

export namespace Relation {
  /**
   * Type that represents any ECHO relation schema.
   * Accepts static schemas (Type.relation()).
   */
  export type Any = RelationSchemaBase;

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

/**
 * Factory function to create an ECHO relation schema.
 * Adds relation metadata annotations to an Effect schema.
 *
 * @example
 * ```ts
 * const WorksFor = Schema.Struct({
 *   role: Schema.String,
 * }).pipe(Type.relation({
 *   typename: 'example.com/type/WorksFor',
 *   version: '0.1.0',
 *   source: Person,
 *   target: Company,
 * }));
 * ```
 */
export const relation: {
  <SourceSchema extends Schema.Schema.AnyNoContext, TargetSchema extends Schema.Schema.AnyNoContext>(
    opts: EchoRelationSchemaOptions<SourceSchema, TargetSchema>,
  ): <Self extends Schema.Schema.Any>(
    self: Self,
  ) => Relation<Schema.Schema.Type<Self>, Schema.Schema.Type<SourceSchema>, Schema.Schema.Type<TargetSchema>>;
} = EchoRelationSchema as any;

//
// Entity - Entity schema types (union of Object | Relation)
//

export namespace Entity {
  /**
   * Runtime Effect schema for any ECHO entity (object or relation).
   * Use for validation, parsing, or type guards on unknown values.
   *
   * @example
   * ```ts
   * if (Schema.is(Type.Entity.Any)(unknownValue)) {
   *   // unknownValue is an ECHO entity
   * }
   * ```
   */
  export const Any: Schema.Schema<
    { id: ObjectId } & Record<string, unknown>,
    { id: string } & Record<string, unknown>
  > = Schema.Union(AnyObjectSchema, AnyRelationSchema);

  /**
   * Type alias for any ECHO entity schema (object or relation).
   * Use this in type annotations for schema parameters.
   */
  export type Any = Obj.Any | Relation.Any;

  /**
   * Type guard to check if a schema is an object schema.
   * NOTE: This checks SCHEMAS, not instances. Use Obj.isObject for instances.
   */
  export const isObject = (schema: Any): schema is Obj.Any => {
    return (schema as any)[EchoSchemaBrandSymbol] === EntityKind.Object;
  };

  /**
   * Type guard to check if a schema is a relation schema.
   * NOTE: This checks SCHEMAS, not instances. Use Relation.isRelation for instances.
   */
  export const isRelation = (schema: Any): schema is Relation.Any => {
    return (schema as any)[EchoSchemaBrandSymbol] === EntityKind.Relation;
  };
}

//
// Ref
//
// NOTE: `Type.Ref` vs `Ref.Ref`:
// - `Type.Ref<T>` is the SCHEMA type - a schema that produces `Ref.Ref<T>` instances.
// - `Ref.Ref<T>` is the INSTANCE type - the actual runtime ref object.
//
// Example:
//   const taskRef: Ref.Ref<Task> = Ref.make(task);  // Instance
//   const schema: Type.Ref<Task> = Type.Ref(Task);  // Schema
//

/**
 * Return type of the `Ref` schema constructor.
 *
 * This typedef avoids `TS4023` error (name from external module cannot be used named).
 * See Effect's note on interface types.
 */
export interface ref<TargetSchema extends Schema.Schema.Any> extends RefSchema<Schema.Schema.Type<TargetSchema>> {}

/**
 * Factory function to create a Ref schema for the given target schema.
 * Use this in schema definitions to declare reference fields.
 *
 * @example
 * ```ts
 * const Task = Schema.Struct({
 *   assignee: Type.Ref(Person),  // Creates a Ref schema
 * }).pipe(Type.object({ typename: 'Task', version: '0.1.0' }));
 * ```
 */
export const Ref: RefFn = Ref$;

/**
 * TypeScript type for a Ref schema.
 * This is the type of the SCHEMA itself, not the runtime ref instance.
 * For the instance type, use `Ref.Ref<T>` from the Ref module.
 *
 * @example
 * ```ts
 * // Schema type annotation (rarely needed, usually inferred):
 * const refSchema: Type.Ref<Task> = Type.Ref(Task);
 *
 * // Instance type annotation (use Ref.Ref instead):
 * const refInstance: Ref.Ref<Task> = Ref.make(task);
 * ```
 */
export interface Ref<T> extends Schema.SchemaClass<Ref$<T>, EncodedReference> {}

export namespace Ref {
  /**
   * Type that represents any Ref schema (with unknown target type).
   * This is a schema type, not an instance type.
   */
  export type Any = Schema.Schema<Ref$<any>, EncodedReference>;
}

//
// Schema utility functions
//

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
