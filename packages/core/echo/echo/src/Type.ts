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
 * Dynamic type that can be constructed, mutated, and persisted in the ECHO database.
 */
export const RuntimeType = typeInternal.EchoSchema;

/**
 * Dynamic type that can be constructed, mutated, and persisted in the ECHO database.
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
 * @returns True if the schema is mutable.
 */
export const isMutable = typeInternal.isMutable;

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
 * Holds the persisted form of a schema — `{ id, name?, typename, version, jsonSchema }`.
 * Merged with the `Type` const via TypeScript declaration merging.
 */
export interface Type extends Schema.Schema.Type<typeof Type> {}

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
 * Returns the underlying Effect Schema for a `Type.Type` runtime value.
 *
 * For static schemas (`Type.object(dxn)`) the value IS the schema, so this returns
 * it unchanged. For mutable (`EchoSchema`-backed) persisted types it returns
 * a rebuilt Effect Schema snapshot.
 */
export const getSchema = <S extends Schema.Schema.All>(type: S): S => {
  if (typeInternal.isMutable(type as any)) {
    return (type as any).snapshot as S;
  }
  return type;
};

/**
 * Perform mutations on a persisted type within a change context.
 *
 * Delegates to the existing `EchoSchema` change plumbing (the `ChangeId` hook
 * on the underlying persistent schema) — the same automerge-transaction
 * primitive `Obj.update(obj, cb)` uses.
 *
 * @throws if the type is not persisted (i.e. not mutable).
 */
export const update = (
  type: AnyType,
  mutator: (draft: { jsonSchema: internal.JsonSchemaType; typename: string; version: string }) => void,
): void => {
  invariant(typeInternal.isMutable(type as any), 'Cannot mutate a type that has not been persisted.');
  const mutable = type as unknown as typeInternal.EchoSchema;
  (mutable as any)._change(mutator);
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
export const updateTypename = (type: AnyType, typename: string): void => {
  const schema = getSchema(type as Schema.Schema.All);
  const updated = typeInternal.setTypenameInSchema(schema as any, typename);
  update(type, (draft) => {
    draft.typename = typename;
    draft.jsonSchema = internal.toJsonSchema(updated);
  });
};

/**
 * Add fields to a persisted type's schema.
 * @throws if the type is not persisted.
 */
export const addFields = (type: AnyType, fields: Schema.Struct.Fields): void => {
  const schema = getSchema(type as Schema.Schema.All);
  const extended = typeInternal.addFieldsToSchema(schema as any, fields);
  update(type, (draft) => {
    draft.jsonSchema = internal.toJsonSchema(extended);
  });
};

/**
 * Replace existing fields on a persisted type's schema.
 * @throws if the type is not persisted.
 */
export const updateFields = (type: AnyType, fields: Schema.Struct.Fields): void => {
  const schema = getSchema(type as Schema.Schema.All);
  const updated = typeInternal.updateFieldsInSchema(schema as any, fields);
  update(type, (draft) => {
    draft.jsonSchema = internal.toJsonSchema(updated);
  });
};

/**
 * Rename a field on a persisted type's schema.
 * @throws if the type is not persisted.
 */
export const updateFieldPropertyName = (
  type: AnyType,
  { before, after }: { before: PropertyKey; after: PropertyKey },
): void => {
  const schema = getSchema(type as Schema.Schema.All);
  const renamed = typeInternal.updateFieldNameInSchema(schema as any, { before, after });
  update(type, (draft) => {
    draft.jsonSchema = internal.toJsonSchema(renamed);
  });
};

/**
 * Remove fields from a persisted type's schema.
 * @throws if the type is not persisted.
 */
export const removeFields = (type: AnyType, fieldNames: string[]): void => {
  const schema = getSchema(type as Schema.Schema.All);
  const removed = typeInternal.removeFieldsFromSchema(schema as any, fieldNames);
  update(type, (draft) => {
    draft.jsonSchema = internal.toJsonSchema(removed);
  });
};
