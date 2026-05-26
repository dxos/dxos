//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import { type EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, EchoURI, type ObjectId, type URI } from '@dxos/keys';

import type * as EntityModule from './Entity';
import * as internal from './internal';
import * as typeInternal from './internal/Type';
import type * as RelationModule from './Relation';

//
// Internal types (not exported)
//

/**
 * Structural base shared by the three sibling type-entity interfaces
 * ({@link Obj}, {@link Relation}, {@link Type}). NOT exported — callers
 * should constrain on {@link AnyEntity} when they want "any of the three"
 * and on the specific kind interface otherwise.
 */
interface BaseTypeEntity<A> {
  /**
   * Entity-kind brand of the type-entity value itself — always `EntityKind.Type`.
   * The kind of instance the type *describes* lives on `[SchemaKindId]`
   * (Object / Relation / Type). Lets `Obj.isObject` / `Relation.isRelation`
   * reject type entities by a single `[KindId]` check.
   */
  readonly [internal.KindId]: internal.EntityKind.Type;

  /** Object id — present once the type has been persisted into a database. */
  readonly id?: ObjectId;

  readonly name?: string;
  readonly typename: string;
  readonly version: string;
  readonly jsonSchema: internal.JsonSchemaType;
  readonly [InstancePhantomId]?: A;
}

/**
 * Type that marks a schema as an ECHO schema.
 * The value indicates the entity kind (Object, Relation, or Type).
 */
type EchoSchemaKind<K extends internal.EntityKind = internal.EntityKind> = {
  readonly [internal.SchemaKindId]: K;
};

//
// Obj — `Type.Type` value for an ECHO object schema.
//

/**
 * TypeScript type for an ECHO object type — a `Type.Type<A>` entity.
 *
 * `T` is the instance type produced by `Obj.make(Foo, props)`. `Fields` is
 * retained as a structural hint (the runtime value still carries `.fields`),
 * but consumers should derive instance/encoded types via `Type.InstanceType`.
 *
 * **Not a `Schema.Schema`.** `Foo.ast` / `Schema.Schema.Type<typeof Foo>` /
 * `Schema.extend(Foo)` no longer typecheck — extract the Effect Schema via
 * `Type.getSchema(Foo)` first, or derive instance types via
 * `Type.InstanceType<typeof Foo>`.
 *
 * @example
 * ```ts
 * const Person = Schema.Struct({
 *   name: Schema.String,
 * }).pipe(Type.makeObject(DXN.make('com.example.type.person', '0.1.0')));
 *
 * type Person = Type.InstanceType<typeof Person>;
 * ```
 */
export interface Obj<T, Fields extends Schema.Struct.Fields = Schema.Struct.Fields> extends BaseTypeEntity<
  T & EntityModule.OfKind<typeof EntityModule.Kind.Object>
> {
  /** Schema-kind brand (object). */
  readonly [internal.SchemaKindId]: internal.EntityKind.Object;

  /** Source Effect Schema — used internally by `Type.getSchema(self)`. */
  readonly [internal.StaticTypeSchemaSlot]: Schema.Schema.AnyNoContext;

  /**
   * The fields defined in the original struct schema.
   * Allows accessing field definitions for introspection.
   */
  readonly fields: Fields;
}

/**
 * Type that represents any ECHO object type — a `Type.Type` entity branded
 * with the object entity kind, i.e. what `Type.makeObject(dxn)` produces.
 */
export type AnyObject = Obj<unknown>;

/**
 * Factory function to create an ECHO object type.
 *
 * Returns a `Type.Type` entity. The returned value also still satisfies
 * `Schema.Schema` at runtime for back-compat — callers should migrate
 * `Schema.Schema.Type<typeof Foo>` to `Type.InstanceType<typeof Foo>`
 * and `Foo.ast` / `Schema.is(Foo)` etc. to use `Type.getSchema(Foo)`.
 *
 * @example
 * ```ts
 * const Person = Schema.Struct({
 *   name: Schema.String,
 * }).pipe(Type.makeObject(DXN.make('com.example.type.person', '0.1.0')));
 * ```
 */
export const makeObject: {
  (dxn: DXN.DXN): <Self extends Schema.Schema.Any>(self: Self) => Obj<Schema.Schema.Type<Self>>;
} = internal.EchoObjectSchema as any;

//
// Type — the ECHO entity that holds a schema and metadata.
// Persisted via `db.add()`; subscribed to via `Filter.type(Type.Type)`.
//

/**
 * ECHO meta-schema entity — stores `{ name?, typename, version, jsonSchema }`.
 * Type-kind sibling of `Type.makeObject(...)` / `Type.makeRelation(...)` outputs.
 * Stored types live under this entity; filter via `Filter.type(Type.Type)`.
 */
export const Type: Type<typeInternal.PersistentSchema> = typeInternal.PersistentSchema as any;

/**
 * Default version stamped on draft (unnamed) types created via
 * {@link makeObjectFromJsonSchema} / {@link makeRelationFromJsonSchema} when
 * the caller does not supply one. Pure dynamic drafts surface as `'0.0.0'`
 * until they are persisted, at which point automerge-heads suffix the version.
 */
const DRAFT_VERSION = '0.0.0';

/**
 * Common props shared by the type-kind factories. Typename and version are
 * optional — drafts omit typename and default version to {@link DRAFT_VERSION}.
 */
type MakeTypeProps = {
  jsonSchema: internal.JsonSchemaType;
  typename?: string;
  version?: string;
  name?: string;
  id?: ObjectId;
};

/**
 * Construct a new object-kind type entity from raw metadata — for cases where
 * an Effect Schema isn't available (e.g. JSON-Schema arriving over the network
 * or from a UI editor). Parallel to {@link makeObject} but takes pre-built
 * `jsonSchema` instead of piping through an Effect schema.
 *
 * The returned entity is in-memory; persist it with `db.add(entity)`.
 */
export const makeObjectFromJsonSchema = (props: MakeTypeProps): Type<typeInternal.PersistentSchema> => {
  return internal.makeObject(typeInternal.PersistentSchema, {
    version: DRAFT_VERSION,
    ...props,
  } as any) as unknown as Type<typeInternal.PersistentSchema>;
};

/**
 * Construct a new relation-kind type entity from raw metadata. Parallel to
 * {@link makeRelation} but takes pre-built `jsonSchema` instead of piping
 * through an Effect schema. `source` / `target` accept either a static
 * `Type.Obj` entity or the well-known `Obj.Unknown` schema.
 *
 * The returned entity is in-memory; persist it with `db.add(entity)`.
 */
export const makeRelationFromJsonSchema = (
  props: MakeTypeProps & {
    source: AnyObject | internal.UnknownTypeSchema<any, typeof EntityModule.Kind.Object>;
    target: AnyObject | internal.UnknownTypeSchema<any, typeof EntityModule.Kind.Object>;
  },
): Type<typeInternal.PersistentSchema> => {
  const { source, target, jsonSchema, ...rest } = props;
  // Embed source/target DXNs + relation entity-kind into the jsonSchema so the
  // entity round-trips correctly through `toEffectSchema` / queries / refs.
  const sourceURI = internal.getTypeURIFromSpecifier(source);
  const targetURI = internal.getTypeURIFromSpecifier(target);
  const enrichedJsonSchema: internal.JsonSchemaType = {
    ...(jsonSchema as any),
    entityKind: internal.EntityKind.Relation,
    relationSource: { $ref: sourceURI },
    relationTarget: { $ref: targetURI },
  };
  return internal.makeObject(typeInternal.PersistentSchema, {
    version: DRAFT_VERSION,
    ...rest,
    jsonSchema: enrichedJsonSchema,
  } as any) as unknown as Type<typeInternal.PersistentSchema>;
};

/**
 * TypeScript type for an ECHO relation type — a `Type.Type<A>` entity.
 *
 * `T` is the instance-property type produced by `Relation.make(...)` (excluding
 * source/target endpoints). `Source` and `Target` are the endpoint types.
 *
 * **Not a `Schema.Schema`.** See {@link Obj}'s note.
 */
export interface Relation<
  T,
  Source,
  Target,
  Fields extends Schema.Struct.Fields = Schema.Struct.Fields,
> extends BaseTypeEntity<
  RelationModule.Endpoints<Source, Target> & T & EntityModule.OfKind<typeof EntityModule.Kind.Relation>
> {
  /** Schema-kind brand (relation). */
  readonly [internal.SchemaKindId]: internal.EntityKind.Relation;

  /** Source Effect Schema — used internally by `Type.getSchema(self)`. */
  readonly [internal.StaticTypeSchemaSlot]: Schema.Schema.AnyNoContext;

  /**
   * The fields defined in the original struct schema.
   * Allows accessing field definitions for introspection.
   */
  readonly fields: Fields;
}

/**
 * Type that represents any ECHO relation type — a `Type.Type` entity branded
 * with the relation entity kind, i.e. what `Type.makeRelation(...)` produces.
 */
export type AnyRelation = Relation<unknown, unknown, unknown>;

/**
 * Factory function to create an ECHO relation schema.
 * Adds relation metadata annotations to an Effect schema.
 *
 * @example
 * ```ts
 * const WorksFor = Schema.Struct({
 *   role: Schema.String,
 * }).pipe(Type.makeRelation({
 *   dxn: DXN.make('com.example.type.worksFor', '0.1.0'),
 *   source: Person,
 *   target: Company,
 * }));
 * ```
 */
export const makeRelation: {
  <SourceInstance, TargetInstance>(opts: {
    dxn: DXN.DXN;
    source: Obj<SourceInstance, any> | internal.UnknownTypeSchema<SourceInstance, typeof EntityModule.Kind.Object>;
    target: Obj<TargetInstance, any> | internal.UnknownTypeSchema<TargetInstance, typeof EntityModule.Kind.Object>;
  }): <Self extends Schema.Schema.Any>(
    self: Self,
  ) => Relation<
    Schema.Schema.Type<Self>,
    SourceInstance & EntityModule.OfKind<typeof EntityModule.Kind.Object>,
    TargetInstance & EntityModule.OfKind<typeof EntityModule.Kind.Object>
  >;
} = internal.EchoRelationSchema as any;

/**
 * Any ECHO type-entity — one of the three sibling kinds: object-kind, relation-kind,
 * or type-kind (the meta-schema). APIs that want "any ECHO type" use this union;
 * the underlying Effect Schema is retrieved via `Type.getSchema`.
 */
export type AnyEntity = AnyObject | AnyRelation | Type;

/**
 * Type guard to check if a schema is an object schema.
 * NOTE: This checks SCHEMAS, not instances. Use Obj.isObject for instances.
 */
export const isObject = (schema: AnyEntity | Schema.Schema.AnyNoContext): schema is AnyObject => {
  if (internal.getSchemaKind(schema) === internal.EntityKind.Object) {
    return true;
  }
  // Schema-side fallback for the well-known `Obj.Unknown` schema (and persisted
  // `Type.Type` entities rebuilt from jsonSchema): inspect the TypeAnnotation kind.
  return Schema.isSchema(schema) && internal.getTypeAnnotation(schema)?.kind === internal.EntityKind.Object;
};

/**
 * Type guard to check if a schema is a relation schema.
 * NOTE: This checks SCHEMAS, not instances. Use Relation.isRelation for instances.
 */
export const isRelation = (schema: AnyEntity | Schema.Schema.AnyNoContext): schema is AnyRelation => {
  if (internal.getSchemaKind(schema) === internal.EntityKind.Relation) {
    return true;
  }
  return Schema.isSchema(schema) && internal.getTypeAnnotation(schema)?.kind === internal.EntityKind.Relation;
};

/**
 * Type guard to check if a value is a type-kind schema (a meta-schema such as
 * `Type.Type`). Mirrors {@link isObject} / {@link isRelation}.
 */
export const isTypeKindSchema = (schema: AnyEntity | Schema.Schema.AnyNoContext): schema is Type => {
  if (internal.getSchemaKind(schema) === internal.EntityKind.Type) {
    return true;
  }
  return Schema.isSchema(schema) && internal.getTypeAnnotation(schema)?.kind === internal.EntityKind.Type;
};

/**
 * Narrow a `Type.AnyEntity` (e.g. one returned from `schemaRegistry.query(...)`)
 * to `AnyObject`, throwing if it describes a relation or the type-kind
 * meta-schema. Use at call sites that need to pass the value to `Obj.make`,
 * `Filter.type`, or other object-only APIs.
 */
export const assertObject = (schema: AnyEntity | Schema.Schema.AnyNoContext): AnyObject => {
  invariant(isObject(schema), 'Expected an object-kind Type entity.');
  return schema;
};

/** Narrow a `Type.AnyEntity` to `AnyRelation`, throwing otherwise. */
export const expectRelation = (schema: AnyEntity | Schema.Schema.AnyNoContext): AnyRelation => {
  invariant(isRelation(schema), 'Expected a relation-kind Type entity.');
  return schema;
};

/** Narrow a `Type.AnyEntity` to the `Type.Type` meta-schema, throwing otherwise. */
export const expectTypeKind = (schema: AnyEntity | Schema.Schema.AnyNoContext): Type => {
  invariant(isTypeKindSchema(schema), 'Expected a type-kind Type entity.');
  return schema;
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
 * Returns the URI identifying a type entity. Always defined.
 *
 * - Static `Type.Obj` / `Type.Relation` → typename DXN (e.g. `dxn:com.example.type.person:0.1.0`).
 * - Persisted `Type.Type` instance (has `id`) → local `EchoURI` (`echo:/<objectId>`).
 * - In-memory `Type.Type` draft (has `id`, no typename) → local `EchoURI`.
 *
 * Only accepts `Type.AnyEntity` entities. Raw `Schema.Schema` values and the
 * branded `Obj.Unknown` / `Relation.Unknown` schemas are intentionally not
 * supported — use `internal.getSchemaURI` or the schema's typename annotation
 * directly when working at the schema level.
 */
export const getURI = (input: AnyEntity): URI.URI => {
  // `getTypeURIFromSpecifier` handles persisted entities (id → EchoURI) and
  // static entities (typename/version → DXN); `getSchemaURI` reads the
  // underlying Effect Schema's annotations via StaticTypeSchemaSlot.
  if (isType(input)) {
    return internal.getTypeURIFromSpecifier(input);
  }
  return internal.getSchemaURI(input) ?? raise(new TypeError('Type entity has no URI'));
};

/**
 * @returns The typename. Example: `com.example.type.person`.
 */
export const getTypename = (input: AnyEntity | Schema.Schema.AnyNoContext): string => {
  const typename = isType(input) ? input.typename : internal.getSchemaTypename(input);
  invariant(typeof typename === 'string' && !typename.startsWith('dxn:'), 'Invalid typename');
  return typename;
};

/**
 * Gets the version.
 * @example 0.1.0
 */
export const getVersion = (input: AnyEntity | Schema.Schema.AnyNoContext): string => {
  const version = isType(input) ? input.version : internal.getSchemaVersion(input);
  invariant(typeof version === 'string' && version.match(/^\d+\.\d+\.\d+$/), 'Invalid version');
  return version;
};

/**
 * Type predicate: true iff the value is any type-kind ECHO entity — a static
 * `Type.Obj` / `Type.Relation` produced by `Type.makeObject` / `Type.makeRelation`, a
 * static meta `Type.Type`, or a persisted `Type.Type` returned by the database.
 *
 * All three branches stamp `[KindId] = Type`, so this is a single brand check.
 * Use {@link isObject} / {@link isRelation} / {@link isTypeKindSchema}
 * when you need to discriminate further; use {@link isMutable} when you mean
 * "is this a db-stored type I can pass to `Type.update`".
 */
export const isType = (value: unknown): value is AnyEntity =>
  internal.getEntityKindBrand(value) === internal.EntityKind.Type;

/**
 * Type predicate: true iff the value is a persisted `Type.Type` entity that
 * can be mutated via `Type.update`. Distinct from {@link isType}: static type
 * entities are also type-kind but are frozen at construction. Implemented by
 * matching against the `PersistentSchema` meta-schema's type URI.
 *
 * Narrowed to `Type & { id: string }` because persisted entities always carry
 * an `id` (the optionality on the base `Type` interface covers static cases).
 */
export const isMutable = (value: unknown): value is Type & { readonly id: string } =>
  internal.isInstanceOf(internal.PersistentSchema, value);

/**
 * ECHO type metadata.
 */
export type Meta = internal.TypeAnnotation;

/**
 * Gets the meta data of the schema.
 */
export const getMeta = (input: AnyEntity | Schema.Schema.AnyNoContext): Meta | undefined => {
  if (isType(input)) {
    // Persisted Type.Type instance — read fields directly. typename may be
    // undefined for unnamed drafts.
    if (typeof input.typename === 'string') {
      return {
        typename: input.typename,
        version: input.version,
        kind: internal.getSchemaKind(input) ?? internal.EntityKind.Object,
      };
    }
    return undefined;
  }
  // Static `Type.Obj` / `Type.Relation` / `Type.Type` entity: unwrap the
  // hidden Effect Schema slot before reading the TypeAnnotation off its AST.
  // Raw Schemas are passed through.
  return internal.getTypeAnnotation(internal.unwrapToSchema(input as Schema.Schema.AnyNoContext));
};

/**
 * String key used to phantom-carry the instance type produced by a `Type.Type`.
 * Used by `Type.InstanceType<typeof Foo>` to recover the schema instance type
 * since `Type.makeObject(dxn)` does not return a `Schema.Schema`.
 *
 * Re-exported from the internal types layer so both `Type.ts` and internal
 * helpers (`makeObject`, `createObject`) reference the same phantom key.
 */
export const InstancePhantomId = internal.InstancePhantomId;
export type InstancePhantomId = internal.InstancePhantomId;

/**
 * Sibling of {@link Obj} / {@link Relation} for the third ECHO entity kind:
 * **type-kind** entities (meta-schemas). The singleton {@link Type} const is
 * the canonical example — it describes stored type definitions themselves.
 *
 * Not a `Schema.Schema`. Use `Type.getSchema(value)` to obtain the underlying
 * Effect Schema and `Type.update(value, draft => ...)` to mutate.
 *
 * `A` is the instance-type phantom — what `Obj.make(value, ...)` would produce.
 * Merged with the `Type` const value via TypeScript declaration merging.
 */
export interface Type<A = unknown> extends Omit<
  BaseTypeEntity<A & EntityModule.OfKind<typeof EntityModule.Kind.Type>>,
  'typename'
> {
  /** Schema-kind brand (type — the meta-schema kind). */
  readonly [internal.SchemaKindId]: internal.EntityKind.Type;

  /** Source Effect Schema — used internally by `Type.getSchema(self)`. */
  readonly [internal.StaticTypeSchemaSlot]: Schema.Schema.AnyNoContext;

  /**
   * Type's typename (e.g. `'com.example.type.person'`). Optional because
   * unnamed draft `Type.Type` entities (`Type.makeObjectFromJsonSchema({ jsonSchema })`)
   * carry no typename until they're given one.
   */
  readonly typename?: string;
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
 * Convenience alias for the instance type produced by a type value.
 *
 * Works uniformly for static schemas (created via `Type.makeObject`/`Type.makeRelation`)
 * and persisted `Type.Type` entities. Prefer this over
 * `Schema.Schema.Type<typeof Foo>` so call sites stay valid regardless of
 * whether `Foo` is a schema or a `Type.Type` entity.
 *
 * Dispatches on the input shape:
 *  - `Type<A>` entity (via the `InstancePhantomId` brand) → `A`
 *  - Effect `Schema.Schema.All`                            → `Schema.Schema.Type<T>`
 */
export type InstanceType<T> =
  T extends Relation<infer Props, infer Source, infer Target, any>
    ? RelationModule.Endpoints<Source, Target> & Props & EntityModule.OfKind<typeof EntityModule.Kind.Relation>
    : T extends Obj<infer A, any>
      ? A & EntityModule.OfKind<typeof EntityModule.Kind.Object>
      : T extends Type<infer A>
        ? A & EntityModule.OfKind<typeof EntityModule.Kind.Type>
        : T extends Schema.Schema.All
          ? Schema.Schema.Type<T>
          : never;

/**
 * Returns the Effect Schema for a type value.
 *
 * - For static schemas (those produced by `Type.makeObject(dxn)` etc.) the input
 *   IS the schema, so this returns it unchanged.
 * - For `Type.Type` entities the schema is rebuilt from `type.jsonSchema`.
 * - Raw `Schema.Schema` inputs (e.g. `Schema.Union(...)` of entity schemas) are
 *   returned unchanged so callers can preserve composite schema signatures
 *   like `Schema.Union<...>`.
 *
 * Always call this when you need to interact with the Effect Schema API
 * (e.g. before passing to Effect.Schema functions). For ECHO-side APIs
 * (`Obj.make`, `Filter.type`, `Ref`) you may pass the type value directly.
 *
 * The first two overloads keep strong typing for the static `Obj` / `Relation`
 * cases where the instance type is known from the value. Persisted `Type.Type`
 * entities and the wide `AnyEntity` union widen to `Schema.Schema.AnyNoContext`
 * because the rebuilt schema's instance type isn't statically knowable.
 */
export function getSchema<T extends AnyObject>(type: T): Schema.Schema<InstanceType<T>>;
export function getSchema<T extends AnyRelation>(type: T): Schema.Schema<InstanceType<T>>;
export function getSchema(type: Type | AnyEntity): Schema.Schema.AnyNoContext;
export function getSchema<T extends Schema.Schema.AnyNoContext>(type: T): T;
export function getSchema(
  type: AnyEntity | Schema.Schema.AnyNoContext,
): Schema.Schema.AnyNoContext {
  // Static `Type.Type` entities carry the source Effect Schema on a hidden
  // slot so we can return it without round-tripping through JsonSchema.
  const staticSchema = internal.getStaticTypeSchema(type);
  if (staticSchema != null) {
    return staticSchema;
  }
  if (isType(type)) {
    // Persisted `Type.Type` entity — build the Effect Schema from its stored
    // jsonSchema and re-attach the TypeIdentifierAnnotation so the rebuilt
    // schema's URI (via getSchemaURI) matches the entity's local EchoURI.
    const rebuilt = internal.toEffectSchema(type.jsonSchema);
    if (typeof type.id === 'string') {
      return rebuilt.annotations({
        [internal.TypeIdentifierAnnotationId]: EchoURI.make({ objectId: type.id }),
      });
    }
    return rebuilt;
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
export const update = (type: AnyEntity, callback: (mutable: Mutable) => void): void => {
  // `Type.Type` is an ECHO object; the change machinery is the same as `Obj.update`.
  internal.change(type, callback as internal.ChangeCallback<AnyEntity>);
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
export const updateTypename = (type: AnyEntity, typename: string): void => {
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
export const addFields = (type: AnyEntity, fields: Schema.Struct.Fields): void => {
  const extended = typeInternal.addFieldsToSchema(getSchema(type), fields);
  update(type, (draft) => {
    draft.jsonSchema = internal.toJsonSchema(extended);
  });
};

/**
 * Replace existing fields on a persisted type's schema.
 * @throws if the type is not persisted.
 */
export const updateFields = (type: AnyEntity, fields: Schema.Struct.Fields): void => {
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
export const removeFields = (type: AnyEntity, fieldNames: string[]): void => {
  const removed = typeInternal.removeFieldsFromSchema(getSchema(type), fieldNames);
  update(type, (draft) => {
    draft.jsonSchema = internal.toJsonSchema(removed);
  });
};
