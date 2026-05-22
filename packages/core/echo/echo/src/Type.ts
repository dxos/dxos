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
// PersistentType (Schema stored in database)
//

export const PersistentType: Obj<typeInternal.PersistentSchema> = typeInternal.PersistentSchema as any;

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

//
// `Type.Type` — first-class type entity.
// Currently structural over the existing annotated-schema representation;
// a follow-up phase folds `EchoSchema` and `PersistentType` into a unified
// entity-backed `Type.Type`.
//

/**
 * The kind of ECHO entity a `Type.Type` describes — object or relation.
 */
export type TypeKind = 'object' | 'relation';

/**
 * Tracks whether a `Type.Type` has been `db.add()`ed.
 */
export type Persistence = 'static' | 'persisted';

/**
 * A first-class ECHO type entity.
 *
 * Structurally equivalent to today's annotated schema classes
 * (`AnyObjectType` / `AnyRelationType`), with the persistence phantom `P`
 * distinguishing types created via `Type.object(dxn)` (`'static'`) from
 * types that have been forked into a database via `db.add(type)`
 * (`'persisted'`).
 */
export interface Type<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _S extends Schema.Schema.All = Schema.Schema.All,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _K extends TypeKind = TypeKind,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _P extends Persistence = Persistence,
> {
  readonly typename: string;
  readonly version: string;
}

/**
 * Convenience alias for the instance type produced by a `Type.Type`.
 */
export type InstanceType<T extends AnyType> = Schema.Schema.Type<T>;

/**
 * Alias for a persisted object-kind type. Use as the parameter type for APIs
 * that require mutation (e.g. `Type.update`).
 */
export type PersistedObjectType<S extends Schema.Schema.All = Schema.Schema.All> = Type<S, 'object', 'persisted'>;

/**
 * Alias for a persisted relation-kind type.
 */
export type PersistedRelationType<S extends Schema.Schema.All = Schema.Schema.All> = Type<S, 'relation', 'persisted'>;

/**
 * Returns the underlying Effect Schema for a `Type.Type`.
 *
 * In the current representation the type entity IS the schema, so this returns
 * the value unchanged for static types. For mutable (`EchoSchema`-backed)
 * persisted types it returns a rebuilt Effect Schema snapshot.
 */
export const getSchema = <S extends Schema.Schema.All>(type: Type<S, TypeKind, Persistence>): S => {
  if (typeInternal.isMutable(type as any)) {
    return (type as any).snapshot as S;
  }
  return type as unknown as S;
};

/**
 * Perform mutations on a persisted type within a change context.
 *
 * Today this delegates to the existing `EchoSchema` mutation plumbing
 * (the `ChangeId` hook on the underlying persistent schema). In the
 * follow-up phase that collapses `EchoSchema` and `PersistentType` into
 * `Type.Type`, this becomes the primary mutation entry point and the
 * field-level helpers (`addFields`, `updateTypename`, …) move out to
 * `@dxos/schema`.
 *
 * @throws if the type is not persisted.
 */
export const update = (
  type: PersistedObjectType | PersistedRelationType,
  mutator: (draft: { jsonSchema: internal.JsonSchemaType; typename: string; version: string }) => void,
): void => {
  invariant(typeInternal.isMutable(type as any), 'Cannot mutate a type that has not been persisted.');
  const mutable = type as unknown as typeInternal.EchoSchema;
  (mutable as any)._change(mutator);
};
