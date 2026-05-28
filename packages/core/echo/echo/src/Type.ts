//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import type * as Types from 'effect/Types';

import { raise } from '@dxos/debug';
import { type EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, EchoURI, type ObjectId, type URI } from '@dxos/keys';

import type * as Database from './Database';
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

  /**
   * Object id. Like all ECHO entities, type entities always carry an id —
   * stamped at construction for in-memory (static) declarations and assigned by
   * the database once persisted. The id does NOT determine the entity's URI:
   * static types resolve to their typename DXN, persisted types to `echo:/<id>`
   * (see `getTypeURIFromSpecifier`).
   */
  readonly id: ObjectId;

  readonly name?: string;
  // NOTE: `typename` / `version` are intentionally NOT fields on any type-entity
  // interface. Both static and persisted entities carry them in `ObjectMeta`
  // (`key` / `version`); read them via `Type.getTypename(self)` /
  // `Type.getVersion(self)` — never as a direct property.
  readonly jsonSchema: internal.JsonSchemaType;
  readonly [InstancePhantomId]?: A;
}

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
export type AnyObj = Obj<unknown>;

/**
 * Factory function to create an ECHO object type.
 *
 * Returns a `Type.Type` entity — a live, in-memory `TypeSchema` instance,
 * NOT a `Schema.Schema`. Use `Type.InstanceType<typeof Foo>` for the instance
 * type and `Type.getSchema(Foo)` to obtain the underlying Effect Schema.
 *
 * The entity's id defaults to `ObjectId.deterministic(typename, version)` so
 * constructing a type never reaches `crypto.getRandomValues()` — required for
 * Cloudflare workerd, which forbids RNG calls in global (module-evaluation)
 * scope. Pass `{ id }` to override (e.g. with `ObjectId.random()` from a
 * request handler).
 *
 * @example
 * ```ts
 * const Person = Schema.Struct({
 *   name: Schema.String,
 * }).pipe(Type.makeObject(DXN.make('com.example.type.person', '0.1.0')));
 * ```
 */
export const makeObject: {
  (
    dxn: DXN.DXN,
    options?: { id?: ObjectId },
  ): <Self extends Schema.Schema.Any>(self: Self) => Obj<Schema.Schema.Type<Self>>;
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
export const Type: Type<typeInternal.TypeSchema> = typeInternal.TypeSchema as any;

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
export const makeObjectFromJsonSchema = (props: MakeTypeProps): Type<typeInternal.TypeSchema> => {
  const { typename, version, ...data } = props;
  // `typename` / `version` are routed through `ObjectMeta` (`key` / `version`)
  // — the canonical registry-provenance pair — not data fields. Drafts default
  // to `'0.0.0'`; the version is omitted from meta entirely when the caller
  // doesn't supply one so the proxy projection can apply its own default.
  return internal.makeObject(
    internal.getStaticTypeSchema(typeInternal.TypeSchema) as any,
    data as any,
    {
      keys: [],
      key: typename,
      version: version ?? DRAFT_VERSION,
    },
    typeInternal.TypeSchema,
  ) as unknown as Type<typeInternal.TypeSchema>;
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
    source: AnyObj | internal.UnknownTypeSchema<any, typeof EntityModule.Kind.Object>;
    target: AnyObj | internal.UnknownTypeSchema<any, typeof EntityModule.Kind.Object>;
  },
): Type<typeInternal.TypeSchema> => {
  const { source, target, jsonSchema, typename, version, ...rest } = props;
  // Embed source/target DXNs + relation entity-kind into the jsonSchema so the
  // entity round-trips correctly through `toEffectSchema` / queries / refs.
  const sourceURI = internal.getTypeURIFromSpecifier(source);
  const targetURI = internal.getTypeURIFromSpecifier(target);
  const enrichedJsonSchema: internal.JsonSchemaType = {
    ...jsonSchema,
    entityKind: internal.EntityKind.Relation,
    relationSource: { $ref: sourceURI },
    relationTarget: { $ref: targetURI },
  };
  // `typename` / `version` route through `ObjectMeta` (see
  // {@link makeObjectFromJsonSchema}); drafts default version to `'0.0.0'`.
  return internal.makeObject(
    internal.getStaticTypeSchema(typeInternal.TypeSchema) as any,
    { ...rest, jsonSchema: enrichedJsonSchema } as any,
    {
      keys: [],
      key: typename,
      version: version ?? DRAFT_VERSION,
    },
    typeInternal.TypeSchema,
  ) as unknown as Type<typeInternal.TypeSchema>;
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
    /**
     * Override the entity id. Defaults to `ObjectId.deterministic(typename, version)`;
     * see `Type.makeObject` for the workerd motivation.
     */
    id?: ObjectId;
  }): <Self extends Schema.Schema.Any>(
    self: Self,
  ) => Relation<
    Schema.Schema.Type<Self>,
    SourceInstance & EntityModule.OfKind<typeof EntityModule.Kind.Object>,
    TargetInstance & EntityModule.OfKind<typeof EntityModule.Kind.Object>
  >;
} = internal.EchoRelationSchema as any;

/**
 * Type that represents any ECHO type-kind entity — a `Type.Type` meta-schema
 * value (static `Type.Type` or a persisted draft from `db.add(...)`).
 * Mirrors {@link AnyObj} / {@link AnyRelation} for the third sibling kind.
 */
export type AnyType = Type<unknown>;

/**
 * Any ECHO type-entity — one of the three sibling kinds: object-kind, relation-kind,
 * or type-kind (the meta-schema). APIs that want "any ECHO type" use this union;
 * the underlying Effect Schema is retrieved via `Type.getSchema`.
 */
export type AnyEntity = AnyObj | AnyRelation | AnyType;

/**
 * Type guard: narrows a `Type.AnyEntity` to an object-kind entity. Checks
 * ENTITIES, not instances — use `Obj.isObject` for instances. Raw
 * `Schema.Schema` values (including the branded `Obj.Unknown` companion)
 * are intentionally not accepted; inspect their `TypeAnnotation` directly.
 */
export const isObject = (entity: AnyEntity): entity is AnyObj => {
  return internal.getSchemaKind(entity) === internal.EntityKind.Object;
};

/**
 * Type guard: narrows a `Type.AnyEntity` to a relation-kind entity. Checks
 * ENTITIES, not instances — use `Relation.isRelation` for instances.
 */
export const isRelation = (entity: AnyEntity): entity is AnyRelation => {
  return internal.getSchemaKind(entity) === internal.EntityKind.Relation;
};

/**
 * Type guard: narrows a `Type.AnyEntity` to the type-kind meta-schema
 * (e.g. `Type.Type`). Mirrors {@link isObject} / {@link isRelation}.
 */
export const isTypeKindSchema = (entity: AnyEntity): entity is Type => {
  return internal.getSchemaKind(entity) === internal.EntityKind.Type;
};

/**
 * Narrow a `Type.AnyEntity` (e.g. one returned from `schemaRegistry.query(...)`)
 * to `AnyObj`, throwing if it describes a relation or the type-kind
 * meta-schema. Use at call sites that need to pass the value to `Obj.make`,
 * `Filter.type`, or other object-only APIs.
 */
export const assertObject = (entity: AnyEntity): AnyObj => {
  invariant(isObject(entity), 'Expected an object-kind Type entity.');
  return entity;
};

/** Narrow a `Type.AnyEntity` to `AnyRelation`, throwing otherwise. */
export const expectRelation = (entity: AnyEntity): AnyRelation => {
  invariant(isRelation(entity), 'Expected a relation-kind Type entity.');
  return entity;
};

/** Narrow a `Type.AnyEntity` to the `Type.Type` meta-schema, throwing otherwise. */
export const expectTypeKind = (entity: AnyEntity): Type => {
  invariant(isTypeKindSchema(entity), 'Expected a type-kind Type entity.');
  return entity;
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
  // For Type entities, route through `getTypeURIFromSpecifier` (id → EchoURI,
  // typename/version → DXN). For Obj/Relation entities, unwrap to the source
  // Effect Schema first and read its annotations.
  if (isType(input)) {
    return internal.getTypeURIFromSpecifier(input);
  }
  return internal.getSchemaURI(getSchema(input)) ?? raise(new TypeError('Type entity has no URI'));
};

/**
 * @returns The typename. Example: `com.example.type.person`.
 *
 * Persisted `Type.Type` entities carry typename in `ObjectMeta.key` (the
 * canonical registry-provenance field); unnamed drafts fall back to the
 * entity's object id so the helper always returns a string. Any `dxn:` or
 * `echo:/` prefix is stripped — typename is a bare identifier, not a URI.
 */
// TODO(wittjosiah): For in-database types this should return the object id once the registry
//   has more robust options for shadowing types (so callers can disambiguate db-stored copies).
export const getTypename = (input: AnyEntity): string => {
  // Both in-memory and in-database entities carry typename in `ObjectMeta.key`
  // — the canonical registry-provenance field. In-memory entities attach meta
  // eagerly (see `makeEchoTypeSchema`), so a single meta-backed read covers
  // both forms. Unnamed drafts fall back to the entity id.
  const meta = internal.getMetaChecked(input);
  let typename: string = (meta.key as string | undefined) ?? (input.id as string);
  // Typename is a bare identifier — strip URI prefixes if a caller seeded
  // meta.key with one accidentally (or if a static entity carries a DXN-
  // style typename).
  typename = stripTypenamePrefix(typename);
  invariant(typeof typename === 'string' && typename.length > 0, 'Invalid typename');
  return typename;
};

/**
 * Gets the version.
 * @example 0.1.0
 * @example 0.1.0-<heads> (in-database, versioned by automerge heads)
 *
 * The registry-provenance semver lives in `ObjectMeta.version`; unversioned
 * drafts default to {@link DRAFT_VERSION} (`'0.0.0'`). In-database entities are
 * additionally versioned by their automerge heads, which are exposed as the
 * semver pre-release tag (`<semver>-<heads>`). In-memory declarations have no
 * heads and surface the bare semver. Read the registry semver alone via
 * `Type.getMeta(input).version`.
 */
export const getVersion = (input: AnyEntity): string => {
  const meta = internal.getMetaChecked(input);
  const semver = (meta.version as string | undefined) ?? DRAFT_VERSION;
  invariant(typeof semver === 'string' && semver.match(/^\d+\.\d+\.\d+$/), 'Invalid version');
  // In-database entities are versioned by their automerge heads; expose them as
  // the semver pre-release tag. In-memory drafts carry no heads → bare semver.
  const heads = internal.version(input).automergeHeads;
  if (heads != null && heads.length > 0) {
    return `${semver}-${[...heads].sort().join('.')}`;
  }
  return semver;
};

/**
 * Strip URI prefixes (`dxn:`, `echo:/`, `echo://`) from a typename string.
 * Typename is a bare identifier — callers reading from meta or from a
 * caller-supplied seed value shouldn't propagate URI prefixes downstream.
 */
const stripTypenamePrefix = (value: string): string => {
  if (value.startsWith('dxn:')) {
    return value.slice('dxn:'.length);
  }
  if (value.startsWith('echo://')) {
    return value.slice('echo://'.length);
  }
  if (value.startsWith('echo:/')) {
    return value.slice('echo:/'.length);
  }
  return value;
};

/**
 * Type predicate: true iff the value is any type-kind ECHO entity — a static
 * `Type.Obj` / `Type.Relation` produced by `Type.makeObject` / `Type.makeRelation`, a
 * static meta `Type.Type`, or a persisted `Type.Type` returned by the database.
 *
 * All three branches stamp `[KindId] = Type`, so this is a single brand check.
 * Use {@link isObject} / {@link isRelation} / {@link isTypeKindSchema}
 * when you need to discriminate further; use {@link getDatabase} when you mean
 * "is this a db-attached type" (vs. an in-memory declaration).
 */
export const isType = (value: unknown): value is AnyEntity =>
  internal.getEntityKindBrand(value) === internal.EntityKind.Type;

/**
 * Get the database the type entity belongs to, or `undefined` if it is an
 * in-memory declaration (`Type.makeObject` / `Type.makeRelation` result) not
 * yet attached to a database. Mirrors `Obj.getDatabase` / `Relation.getDatabase`.
 *
 * Database attachment is the canonical discriminator between in-memory and
 * in-database type entities — both are live reactive `TypeSchema` instances and
 * are otherwise indistinguishable.
 */
export const getDatabase = (input: AnyEntity): Database.Database | undefined => internal.getDatabase(input);

/**
 * Mutable meta type returned by `Type.getMeta` inside a `Type.update` callback.
 * Mirrors `Obj.Meta` / `Relation.Meta` — `Type.Type` is an Entity like its
 * siblings, so its meta is the same `ObjectMeta` record:
 * `{ keys, tags?, key?, version? }`.
 *
 * `key` / `version` here are the canonical registry-provenance pair
 * (typename + semver) on persisted Type.Type entities; they are absent on
 * unnamed drafts. Use {@link getTypename} / {@link getVersion} when you want
 * a non-`undefined` value with id / {@link DRAFT_VERSION} fallbacks.
 */
export type Meta = internal.Meta;

/**
 * Deeply read-only version of {@link Meta}.
 * Prevents mutation at all nesting levels (e.g., `meta.keys.push()` is a TS error).
 */
export type ReadonlyMeta = internal.ReadonlyMeta;

/**
 * Returns the entity's `ObjectMeta`. Same semantics as `Obj.getMeta` /
 * `Relation.getMeta` — `Type.Type` is an Entity and carries the canonical
 * `ObjectMeta` directly. Returns mutable meta when passed a mutable type
 * (inside a `Type.update` callback), read-only meta otherwise.
 *
 * For persisted Type entities, `meta.key` holds the typename and
 * `meta.version` holds the semver. Use {@link getTypename} / {@link getVersion}
 * if you want the helpers' id / {@link DRAFT_VERSION} fallbacks for drafts.
 *
 * Both persisted and in-memory type entities (`Type.makeObject` /
 * `Type.makeRelation` results) carry their `ObjectMeta` via `[MetaId]`, so the
 * lookup is uniform.
 */
export function getMeta(entity: internal.Mutable<AnyEntity>): Meta;
export function getMeta(entity: Mutable): Meta;
export function getMeta(entity: AnyEntity): ReadonlyMeta;
export function getMeta(entity: AnyEntity | internal.Mutable<AnyEntity> | Mutable): ReadonlyMeta | Meta {
  // The `Mutable` overload accepts the narrowed view passed to `Type.update`
  // callbacks; at runtime that draft IS the underlying persisted Type entity,
  // so the same `MetaId` lookup works.
  invariant(isType(entity), 'Expected a Type entity.');
  // Both persisted and in-memory type entities carry runtime `ObjectMeta` via
  // `[MetaId]`, so the lookup is uniform.
  return internal.getMetaChecked(entity);
}

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
export interface Type<A = unknown> extends BaseTypeEntity<A & EntityModule.OfKind<typeof EntityModule.Kind.Type>> {
  /** Schema-kind brand (type — the meta-schema kind). */
  readonly [internal.SchemaKindId]: internal.EntityKind.Type;

  /** Source Effect Schema — used internally by `Type.getSchema(self)`. */
  readonly [internal.StaticTypeSchemaSlot]: Schema.Schema.AnyNoContext;
}

/**
 * Instance type produced by a Type entity.
 *
 * Accepts ONLY {@link AnyEntity} inputs — `Type.Obj`, `Type.Relation`, or
 * `Type.Type`. Raw Effect `Schema.Schema` values are rejected: for those, use
 * `Schema.Schema.Type<typeof Foo>` directly. This separation keeps the type
 * system honest about which values represent ECHO entities versus plain
 * Effect schemas.
 *
 * Dispatches on the entity kind:
 *  - `Relation<Props, S, T>` → `Endpoints<S,T> & Props & OfKind<Relation>`
 *  - `Obj<A>`                → `A & OfKind<Object>`
 *  - `Type<A>`               → `A & OfKind<Type>`
 */
export type InstanceType<T extends AnyEntity> =
  T extends Relation<infer Props, infer Source, infer Target, any>
    ? RelationModule.Endpoints<Source, Target> & Props & EntityModule.OfKind<typeof EntityModule.Kind.Relation>
    : T extends Obj<infer A, any>
      ? A & EntityModule.OfKind<typeof EntityModule.Kind.Object>
      : T extends Type<infer A>
        ? A & EntityModule.OfKind<typeof EntityModule.Kind.Type>
        : never;

/**
 * Returns the Effect Schema for a type entity.
 *
 * - For static `Type.Obj` / `Type.Relation` entities the source Effect Schema is
 *   read from a hidden slot — these overloads preserve the instance type.
 * - For `Type.Type` entities (the meta-schema kind) the schema is rebuilt from
 *   `type.jsonSchema`; the instance type isn't statically knowable so the wide
 *   `AnyEntity` overload widens to `Schema.Schema.AnyNoContext`.
 *
 * Always call this when you need to interact with the Effect Schema API
 * (e.g. before passing to Effect.Schema functions). For ECHO-side APIs
 * (`Obj.make`, `Filter.type`, `Ref`) pass the type entity directly.
 *
 * Only accepts `Type.AnyEntity` — raw `Schema.Schema` values can be used
 * directly without unwrapping.
 */
export function getSchema<T extends AnyObj>(type: T): Schema.Schema<InstanceType<T>>;
export function getSchema<T extends AnyRelation>(type: T): Schema.Schema<InstanceType<T>>;
export function getSchema(type: AnyEntity): Schema.Schema.AnyNoContext;
export function getSchema(type: AnyEntity): Schema.Schema.AnyNoContext {
  // Static `Type.Type` entities carry the source Effect Schema on a hidden
  // slot so we can return it without round-tripping through JsonSchema.
  const staticSchema = internal.getStaticTypeSchema(type);
  if (staticSchema != null) {
    return staticSchema;
  }
  invariant(isType(type), 'Expected a Type entity.');
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

/**
 * Mutable view of a `Type.Type` — the shape passed to the `Type.update` callback.
 * Outside `Type.update`, `Type.Type` fields are read-only (both at the type level
 * and at runtime — direct assignment throws). Use this to constrain mutation to
 * the change context, analogous to `Obj.update(obj, (draft) => ...)`.
 *
 * NOTE: `typename` and `version` are intentionally absent — they live in
 * `ObjectMeta` (`key` / `version` — the canonical registry-provenance pair).
 * Read them via {@link getTypename} / {@link getVersion} / {@link getMeta};
 * `typename` is treated as immutable on persisted entities.
 *
 * Unlike `Obj.update` — whose mutable view is inferred as `Mutable<A>` over the
 * whole instance type because every data field is editable — a `Type.Type`
 * exposes only `name` and `jsonSchema` for mutation. The rest of its shape
 * (`id`, the `[KindId]` / `[SchemaKindId]` brands, and `typename` / `version`
 * in meta) is immutable, so this view is declared explicitly rather than
 * derived from `InstanceType<Type.Type>`.
 */
export interface Mutable {
  name?: string;
  // Deep-mutable within the change context — `Type.update`'s purpose is to allow
  // mutation, so the draft exposes `jsonSchema` as writable (the readonly
  // `JsonSchemaType` would force callers to cast).
  jsonSchema: Types.DeepMutable<internal.JsonSchemaType>;
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
// `db.add(schemaEntity)`) and the helper drives the change context.
//

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

/**
 * Returns the identifier DXN string (`dxn:echo:@:<objectId>`) for a persisted
 * type entity (one returned by the database), or `undefined` for in-memory
 * static type declarations.
 *
 * The identifier DXN is the canonical key under which the type is indexed in
 * the graph registry (as opposed to the typename-based DXN). Callers that want
 * the human-readable typename DXN should use `Type.getURI` instead.
 */
export const getDXN = (input: AnyEntity): string | undefined => {
  // Only persisted Type entities (attached to a database) have an identifier DXN.
  if (isType(input) && getDatabase(input) != null && typeof (input as any).id === 'string') {
    return `dxn:echo:@:${(input as any).id}`;
  }
  return undefined;
};
