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
  type AnyEntity,
  type AnyProperties,
  EchoObjectSchema,
  EchoRelationSchema,
  type EchoRelationSchemaOptions,
  EchoSchema,
  EchoSchemaBrandSymbol,
  EntityKind,
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
// Obj - Runtime schema for any ECHO object
//

/**
 * Runtime Effect schema for any ECHO object.
 * Use for validation, parsing, type guards, or as a reference target for collections
 * that can hold references to any ECHO object type.
 *
 * @example
 * ```ts
 * // Type guard
 * if (Schema.is(Type.Obj)(unknownValue)) {
 *   // unknownValue is an ECHO object
 * }
 *
 * // Reference to any object type
 * const Collection = Schema.Struct({
 *   objects: Schema.Array(Type.Ref(Type.Obj)),
 * }).pipe(Type.object({ typename: 'Collection', version: '0.1.0' }));
 * ```
 */
// NOTE: The `any` in the type intersection is intentional. It makes this type bidirectionally
//   assignable with specific object types (e.g., you can assign `Type.Obj` to `Meeting.Meeting`
//   and vice versa). This is a pragmatic choice to avoid requiring casts everywhere operation
//   schemas are used, since operations erase the specific type information.
// TODO(wittjosiah): Consider alternatives to the `any` intersection hack.
//   The `any` in the type makes it assignable to/from specific object types (e.g., Meeting.Meeting).
//   This is needed because operation schemas (like SpaceOperation.AddObject) erase type information -
//   you pass in a specific type but get back a generic Type.Obj. Without `any`, callers would need
//   explicit casts or instanceOf checks at every call site.
//   Alternatives to consider:
//   - Generic operation schemas that preserve input type in output
//   - Branded types that specific schemas also carry
//   - Accept the limitation and require explicit type narrowing at call sites
// NOTE: The EchoObjectSchema annotation below is required for Type.Ref(Type.Obj) to work.
//   The typename and version are not used for validation - they only satisfy the ECHO schema
//   machinery that requires these annotations for reference targets. No objects will ever
//   have this typename; it exists only to make Type.Obj a valid reference target.
export const Obj: Schema.Schema<
  any & AnyEntity & Entity$.OfKind<typeof Entity$.Kind.Object> & AnyProperties,
  { id: string } & AnyProperties
> = Schema.Struct({
  id: Schema.String,
}).pipe(
  Schema.extend(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  EchoObjectSchema({ typename: 'dxos.org/schema/AnyObject', version: '0.0.0' }),
) as unknown as Schema.Schema<
  any & AnyEntity & Entity$.OfKind<typeof Entity$.Kind.Object> & AnyProperties,
  { id: string } & AnyProperties
>;

/**
 * TypeScript type for an ECHO object schema.
 * `T` is the instance type produced by the schema.
 * `Fields` is the optional struct fields type for introspection.
 *
 * @example
 * ```ts
 * const PersonSchema: Type.Obj<Person> = Schema.Struct({
 *   name: Schema.String,
 * }).pipe(Type.object({ typename: 'Person', version: '0.1.0' }));
 *
 * // Access fields for introspection:
 * Object.keys(PersonSchema.fields); // ['name']
 * ```
 */
export interface Obj<T = any, Fields extends Schema.Struct.Fields = Schema.Struct.Fields>
  extends TypeMeta,
    EchoSchemaBranded<EntityKind.Object>,
    Schema.AnnotableClass<
      Obj<T, Fields>,
      Entity$.OfKind<typeof Entity$.Kind.Object> & T,
      Schema.Simplify<ObjJsonProps & ToMutable<T>>,
      never
    > {
  /**
   * The fields defined in the original struct schema.
   * Allows accessing field definitions for introspection.
   */
  readonly fields: Fields;
}

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
// PersistentType (Schema stored in database)
//

export const PersistentType: Obj<PersistentSchema> = PersistentSchema as any;

export interface PersistentType extends Schema.Schema.Type<typeof PersistentType> {}

export { EchoSchema as RuntimeType };

//
// Relation - Runtime schema for any ECHO relation
//

/**
 * Runtime Effect schema for any ECHO relation.
 * Use for validation, parsing, type guards, or as a reference target for collections
 * that can hold references to any ECHO relation type.
 * A relation has `id`, source, and target fields plus any additional properties.
 */
// NOTE: The EchoRelationSchema annotation below is required for Type.Ref(Type.Relation) to work.
//   The typename, version, source, and target are not used for validation - they only satisfy
//   the ECHO schema machinery that requires these annotations for reference targets. No relations
//   will ever have this typename; it exists only to make Type.Relation a valid reference target.
export const Relation: Schema.Schema<
  { id: ObjectId } & Record<string, unknown>,
  { id: string } & Record<string, unknown>
> = Schema.Struct({
  id: Schema.String,
}).pipe(
  Schema.extend(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  EchoRelationSchema({
    typename: 'dxos.org/schema/AnyRelation',
    version: '0.0.0',
    // Source and target use Type.Obj to satisfy the ECHO schema requirement.
    source: Obj,
    target: Obj,
  }),
) as unknown as Schema.Schema<{ id: ObjectId } & Record<string, unknown>, { id: string } & Record<string, unknown>>;

/**
 * TypeScript type for an ECHO relation schema.
 * `T` is the instance type produced by the schema (excluding source/target).
 * `Source` and `Target` are the endpoint types.
 * `Fields` is the optional struct fields type for introspection.
 */
export interface Relation<
  T = any,
  Source = any,
  Target = any,
  Fields extends Schema.Struct.Fields = Schema.Struct.Fields,
> extends TypeMeta,
    EchoSchemaBranded<EntityKind.Relation>,
    Schema.AnnotableClass<
      Relation<T, Source, Target, Fields>,
      Entity$.OfKind<typeof Entity$.Kind.Relation> & Relation.Endpoints<Source, Target> & T,
      Schema.Simplify<RelationJsonProps & ToMutable<T>>,
      never
    > {
  /**
   * The fields defined in the original struct schema.
   * Allows accessing field definitions for introspection.
   */
  readonly fields: Fields;
}

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
  > = Schema.Union(Obj, Relation);

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
