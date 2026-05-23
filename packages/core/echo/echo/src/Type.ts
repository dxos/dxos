//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Schema from 'effect/Schema';

import { type EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, type URI } from '@dxos/keys';
import { type ToMutable } from '@dxos/util';

import type * as Entity from './Entity';
import * as internal from './internal';
import * as typeInternal from './internal/Type';
import type * as ObjModule from './Obj';
import type * as RelationModule from './Relation';

/**
 * Runtime instance of a mutable, persisted type — what `db.schemaRegistry.register`
 * returns. Wraps the underlying `Type.Type` ECHO object and provides reactive
 * `id`, `typename`, `version`, `jsonSchema` accessors plus an `addFields` /
 * `updateTypename` mutation surface (preferred: use `Type.update` and the
 * `Type.{addFields,updateTypename,…}` free functions).
 *
 * Exported as a TYPE only; the underlying class is an internal implementation
 * detail. Use `Type.isMutable(value)` for runtime checks instead of
 * `value instanceof <class>`.
 */
export type RuntimeType = typeInternal.EchoSchema;

//
// Internal types (not exported)
//

/**
 * Type that marks a schema as an ECHO schema.
 * The value indicates the entity kind (Object or Relation).
 */
type EchoSchemaKind<K extends internal.EntityKind = internal.EntityKind> = {
  readonly [internal.SchemaKindId]: K;
};

//
// Obj - Runtime schema for any ECHO object
//

/**
 * TypeScript type for an ECHO object schema.
 * `T` is the instance type produced by the schema.
 * `Fields` is the optional struct fields type for introspection.
 *
 * @example
 * ```ts
 * const PersonSchema: Type.Obj<Person> = Schema.Struct({
 *   name: Schema.String,
 * }).pipe(Type.object(DXN.make('com.example.type.person', '0.1.0')));
 *
 * // Access fields for introspection:
 * Object.keys(PersonSchema.fields); // ['name']
 * ```
 */
export interface Obj<T, Fields extends Schema.Struct.Fields = Schema.Struct.Fields>
  extends
    internal.TypeMeta,
    EchoSchemaKind<internal.EntityKind.Object>,
    Schema.AnnotableClass<
      Obj<T, Fields>,
      Entity.OfKind<typeof Entity.Kind.Object> & T,
      Schema.Simplify<ObjModule.BaseObjJson & ToMutable<T>>,
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
 * Use Type.isObjectSchema() for runtime type guards.
 */
type ObjectSchemaBase = Schema.Schema.AnyNoContext & {
  readonly typename: string;
  readonly version: string;
};

/**
 * Type that represents any ECHO object schema (or "object type").
 * Accepts both static schemas (Type.object()) and mutable schemas (EchoSchema).
 */
export type AnyObjectType = ObjectSchemaBase;

/**
 * Factory function to create an ECHO object schema.
 * Adds object metadata annotations to an Effect schema.
 *
 * @example
 * ```ts
 * const Person = Schema.Struct({
 *   name: Schema.String,
 * }).pipe(Type.object(DXN.make('com.example.type.person', '0.1.0')));
 * ```
 */
export const object: {
  (dxn: DXN.DXN): <Self extends Schema.Schema.Any>(self: Self) => Obj<Schema.Schema.Type<Self>>;
} = internal.EchoObjectSchema as any;

//
// Type — the ECHO entity that holds a schema and metadata.
// Persisted via `db.add()`; subscribed to via `Filter.type(Type.Type)`.
//

/**
 * ECHO schema for a `Type.Type` entity. Stores `{ name?, typename, version, jsonSchema }`.
 */
export const Type: Obj<typeInternal.PersistentSchema> = typeInternal.PersistentSchema as any;

/**
 * TypeScript type for an ECHO relation schema.
 * `T` is the instance type produced by the schema (excluding source/target).
 * `Source` and `Target` are the endpoint types.
 * `Fields` is the optional struct fields type for introspection.
 */
export interface Relation<T, Source, Target, Fields extends Schema.Struct.Fields = Schema.Struct.Fields>
  extends
    internal.TypeMeta,
    EchoSchemaKind<internal.EntityKind.Relation>,
    Schema.AnnotableClass<
      Relation<T, Source, Target, Fields>,
      Entity.OfKind<typeof Entity.Kind.Relation> & RelationModule.Endpoints<Source, Target> & T,
      Schema.Simplify<RelationModule.BaseRelationJson & ToMutable<T>>,
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
 * Use Type.isRelationSchema() for runtime type guards.
 */
type RelationSchemaBase = Schema.Schema.AnyNoContext & {
  readonly typename: string;
  readonly version: string;
};

/**
 * Type that represents any ECHO relation schema (or "relation type").
 * Accepts static schemas (Type.relation()).
 */
export type AnyRelationType = RelationSchemaBase;

/**
 * Factory function to create an ECHO relation schema.
 * Adds relation metadata annotations to an Effect schema.
 *
 * @example
 * ```ts
 * const WorksFor = Schema.Struct({
 *   role: Schema.String,
 * }).pipe(Type.relation({
 *   dxn: DXN.make('com.example.type.worksFor', '0.1.0'),
 *   source: Person,
 *   target: Company,
 * }));
 * ```
 */
export const relation: {
  <SourceSchema extends Schema.Schema.AnyNoContext, TargetSchema extends Schema.Schema.AnyNoContext>(
    opts: internal.EchoRelationSchemaOptions<SourceSchema, TargetSchema>,
  ): <Self extends Schema.Schema.Any>(
    self: Self,
  ) => Relation<Schema.Schema.Type<Self>, Schema.Schema.Type<SourceSchema>, Schema.Schema.Type<TargetSchema>>;
} = internal.EchoRelationSchema as any;

/**
 * Type alias for any ECHO type (object or relation).
 * Use this in type annotations for type parameters.
 */
export type AnyType = AnyObjectType | AnyRelationType;

/**
 * Type guard to check if a schema is an object schema.
 * NOTE: This checks SCHEMAS, not instances. Use Obj.isObject for instances.
 */
export const isObjectSchema = (schema: AnyType): schema is AnyObjectType => {
  return (schema as any)[internal.SchemaKindId] === internal.EntityKind.Object;
};

/**
 * Type guard to check if a schema is a relation schema.
 * NOTE: This checks SCHEMAS, not instances. Use Relation.isRelation for instances.
 */
export const isRelationSchema = (schema: AnyType): schema is AnyRelationType => {
  return (schema as any)[internal.SchemaKindId] === internal.EntityKind.Relation;
};

/**
 * Type that represents any Ref schema (with unknown target type).
 * This is a schema type, not an instance type.
 */
export type AnyRef = Schema.Schema<internal.Ref<any>, EncodedReference>;

//
// Schema utility functions
//

/**
 * Gets the URI identifying the schema — currently always a DXN, but typed as
 * `URI.URI` so future stored-schema URIs (echo:/…) can be returned without
 * breaking callers.
 * @example "dxn:com.example.type.person:0.1.0"
 */
export const getURI = (schema: AnyType): URI.URI | undefined => {
  return internal.getSchemaURI(schema);
};

/**
 * @param schema - Schema to get the typename from.
 * @returns The typename of the schema. Example: `com.example.type.person`.
 */
export const getTypename = (schema: AnyType): string => {
  const typename = internal.getSchemaTypename(schema);
  invariant(typeof typename === 'string' && !typename.startsWith('dxn:'), 'Invalid typename');
  return typename;
};

/**
 * Gets the version of the schema.
 * @example 0.1.0
 */
export const getVersion = (schema: AnyType): string => {
  const version = internal.getSchemaVersion(schema);
  invariant(typeof version === 'string' && version.match(/^\d+\.\d+\.\d+$/), 'Invalid version');
  return version;
};

/**
 * Type predicate: true iff the value is a mutable (persisted) `Type.Type`.
 *
 * Mutable types are produced by `db.schemaRegistry.register(...)` (and stored as
 * ECHO objects in a space). Outside that, you have an immutable static schema
 * produced by `Type.object(...)`, which cannot be passed to `Type.update`.
 */
export const isMutable = (value: unknown): value is Type => typeInternal.isMutable(value);

/**
 * ECHO type metadata.
 */
export type Meta = internal.TypeAnnotation;

/**
 * Gets the meta data of the schema.
 */
export const getMeta = (schema: AnyType): Meta | undefined => {
  return internal.getTypeAnnotation(schema);
};

/**
 * Instance type of a `Type.Type` ECHO entity.
 *
 * A `Type.Type` is an ECHO object that holds the persisted form of a type
 * definition (`id`, `name?`, `typename`, `version`, `jsonSchema`). At runtime
 * the value also implements `Schema.Schema` (its `.ast` / `.annotations` /
 * `.pipe` are lazily rebuilt from `jsonSchema`) so it can be passed directly to
 * ECHO APIs like `Obj.make`, `Filter.type`, and `Ref` without an extra unwrap.
 *
 * To access the underlying Effect Schema explicitly call `Type.getSchema(type)`.
 * To mutate, use `Type.update(type, draft => ...)`.
 *
 * Merged with the `Type` const via TypeScript declaration merging.
 */
export interface Type extends Schema.Schema.AnyNoContext, Entity.OfKind<typeof Entity.Kind.Object> {
  readonly name?: string;
  readonly typename: string;
  readonly version: string;
  readonly jsonSchema: internal.JsonSchemaType;
}

/**
 * The kind of ECHO entity a `Type.Type` describes — object or relation.
 */
export type TypeKind = 'object' | 'relation';

/**
 * Tracks whether a `Type.Type` has been `db.add()`ed.
 */
export type Persistence = 'static' | 'persisted';

/**
 * Convenience alias for the instance type produced by a `Type.Type`.
 */
export type InstanceType<T extends AnyType> = Schema.Schema.Type<T>;

/**
 * Returns the Effect Schema for a type value.
 *
 * - For static schemas (those produced by `Type.object(dxn)` etc.) the input
 *   IS the schema, so this returns it unchanged.
 * - For `Type.Type` entities the schema is rebuilt from `type.jsonSchema`.
 *
 * Always call this when you need to interact with the Effect Schema API
 * (e.g. before passing to Effect.Schema functions). For ECHO-side APIs
 * (`Obj.make`, `Filter.type`, `Ref`) you may pass the type value directly.
 */
export const getSchema = (type: AnyObjectType | AnyRelationType | Type): Schema.Schema.AnyNoContext => {
  if (typeInternal.isMutable(type)) {
    return type.snapshot;
  }
  return type as Schema.Schema.AnyNoContext;
};

/**
 * Mutable view of a `Type.Type` — the shape passed to the `Type.update` callback.
 * Outside `Type.update`, `Type.Type` fields are read-only (both at the type level
 * and at runtime — direct assignment throws). Use this to constrain mutation to
 * the change context, analogous to `Obj.update(obj, (draft) => ...)`.
 */
export interface Mutable {
  name?: string;
  typename: string;
  version: string;
  jsonSchema: internal.JsonSchemaType;
}

/**
 * Perform mutations on a `Type.Type` within a change context.
 *
 * The callback receives a {@link Mutable} view of the type — direct mutation of
 * a `Type.Type` outside `Type.update` throws at runtime, mirroring `Obj.update`.
 * Delegates to the same automerge-transaction primitive `Obj.update(obj, cb)` uses.
 */
export const update = (type: Type, callback: (mutable: Mutable) => void): void => {
  // `Type.Type` is an ECHO object; the change machinery is the same as `Obj.update`.
  // Internal runtime caches (e.g. the lazy Effect-Schema cache on the EchoSchema
  // wrapper) are picked up via the type's hidden change hook.
  const target = typeInternal.isMutable(type) ? typeInternal.getEchoSchemaPersistentObject(type) : type;
  internal.change(target as any, callback as (draft: any) => void);
};

//
// Field-level helpers for mutating persisted types.
// These are thin wrappers over `Type.update` plus the JsonSchema manipulation
// utilities. Callers pass a persisted `Type.Type` (e.g. one returned by
// `DatabaseSchemaRegistry.register`) and the helper drives the change context.
//

/**
 * Replace the typename on a persisted type.
 * @throws if the type is not persisted.
 */
export const updateTypename = (type: Type, typename: string): void => {
  const updated = typeInternal.setTypenameInSchema(getSchema(type), typename);
  update(type, (draft) => {
    draft.typename = typename;
    draft.jsonSchema = internal.toJsonSchema(updated);
  });
};

/**
 * Add fields to a persisted type's schema.
 * @throws if the type is not persisted.
 */
export const addFields = (type: Type, fields: Schema.Struct.Fields): void => {
  const extended = typeInternal.addFieldsToSchema(getSchema(type), fields);
  update(type, (draft) => {
    draft.jsonSchema = internal.toJsonSchema(extended);
  });
};

/**
 * Replace existing fields on a persisted type's schema.
 * @throws if the type is not persisted.
 */
export const updateFields = (type: Type, fields: Schema.Struct.Fields): void => {
  const updated = typeInternal.updateFieldsInSchema(getSchema(type), fields);
  update(type, (draft) => {
    draft.jsonSchema = internal.toJsonSchema(updated);
  });
};

/**
 * Rename a field on a persisted type's schema.
 * @throws if the type is not persisted.
 */
export const updateFieldPropertyName = (
  type: Type,
  { before, after }: { before: PropertyKey; after: PropertyKey },
): void => {
  const renamed = typeInternal.updateFieldNameInSchema(getSchema(type), { before, after });
  update(type, (draft) => {
    draft.jsonSchema = internal.toJsonSchema(renamed);
  });
};

/**
 * Remove fields from a persisted type's schema.
 * @throws if the type is not persisted.
 */
export const removeFields = (type: Type, fieldNames: string[]): void => {
  const removed = typeInternal.removeFieldsFromSchema(getSchema(type), fieldNames);
  update(type, (draft) => {
    draft.jsonSchema = internal.toJsonSchema(removed);
  });
};
