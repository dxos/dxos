//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { type EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';
import { type ToMutable } from '@dxos/util';

import type * as Entity from './Entity';
import * as internal from './internal';
import type * as ObjModule from './Obj';
import type * as RelationModule from './Relation';

/**
 * Dynamic type that can be constructed, mutated, and persisted in the ECHO database.
 */
export const RuntimeType = internal.EchoSchema;

/**
 * Dynamic type that can be constructed, mutated, and persisted in the ECHO database.
 */
export type RuntimeType = internal.EchoSchema;

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
 * }).pipe(Type.object({ typename: 'Person', version: '0.1.0' }));
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
 * Type that represents any ECHO object schema.
 * Accepts both static schemas (Type.object()) and mutable schemas (EchoSchema).
 */
export type AnyObj = ObjectSchemaBase;

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
  (opts: internal.TypeMeta): <Self extends Schema.Schema.Any>(self: Self) => Obj<Schema.Schema.Type<Self>>;
} = internal.EchoObjectSchema as any;

//
// PersistentType (Schema stored in database)
//

export const PersistentType: Obj<internal.PersistentSchema> = internal.PersistentSchema as any;

export interface PersistentType extends Schema.Schema.Type<typeof PersistentType> {}

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
 * Type that represents any ECHO relation schema.
 * Accepts static schemas (Type.relation()).
 */
export type AnyRelation = RelationSchemaBase;

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
    opts: internal.EchoRelationSchemaOptions<SourceSchema, TargetSchema>,
  ): <Self extends Schema.Schema.Any>(
    self: Self,
  ) => Relation<Schema.Schema.Type<Self>, Schema.Schema.Type<SourceSchema>, Schema.Schema.Type<TargetSchema>>;
} = internal.EchoRelationSchema as any;

/**
 * Type alias for any ECHO entity schema (object or relation).
 * Use this in type annotations for schema parameters.
 */
export type AnyEntity = AnyObj | AnyRelation;

/**
 * Type guard to check if a schema is an object schema.
 * NOTE: This checks SCHEMAS, not instances. Use Obj.isObject for instances.
 */
export const isObjectSchema = (schema: AnyEntity): schema is AnyObj => {
  return (schema as any)[internal.SchemaKindId] === internal.EntityKind.Object;
};

/**
 * Type guard to check if a schema is a relation schema.
 * NOTE: This checks SCHEMAS, not instances. Use Relation.isRelation for instances.
 */
export const isRelationSchema = (schema: AnyEntity): schema is AnyRelation => {
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
 * Gets the full DXN of the schema.
 * Will include the version if it's a `type` DXN.
 * @example "dxn:example.com/type/Person:0.1.0"
 * @example "dxn:echo:SSSSSSSSSS:XXXXXXXXXXXXX"
 */
export const getDXN = (schema: AnyEntity): DXN | undefined => {
  return internal.getSchemaDXN(schema);
};

/**
 * @param schema - Schema to get the typename from.
 * @returns The typename of the schema. Example: `example.com/type/Person`.
 */
export const getTypename = (schema: AnyEntity): string => {
  const typename = internal.getSchemaTypename(schema);
  invariant(typeof typename === 'string' && !typename.startsWith('dxn:'), 'Invalid typename');
  return typename;
};

/**
 * Gets the version of the schema.
 * @example 0.1.0
 */
export const getVersion = (schema: AnyEntity): string => {
  const version = internal.getSchemaVersion(schema);
  invariant(typeof version === 'string' && version.match(/^\d+\.\d+\.\d+$/), 'Invalid version');
  return version;
};

/**
 * @returns True if the schema is mutable.
 */
export const isMutable = internal.isMutable;

/**
 * ECHO type metadata.
 */
export type Meta = internal.TypeAnnotation;

/**
 * Gets the meta data of the schema.
 */
export const getMeta = (schema: AnyEntity): Meta | undefined => {
  return internal.getTypeAnnotation(schema);
};
