//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import type { ForeignKey } from '@dxos/echo-protocol';
import type { EntityId, URI } from '@dxos/keys';

import * as internal from './internal';
import * as objInternal from './internal/Obj';
import type * as Ref from './Ref';
import type * as Relation from './Relation';
import type * as Tag from './Tag';
import * as Type from './Type';

// Re-export KindId and SnapshotKindId from internal.
export const KindId = internal.KindId;
export type KindId = typeof internal.KindId;
export const SnapshotKindId = internal.SnapshotKindId;
export type SnapshotKindId = typeof internal.SnapshotKindId;

// NOTE: Relation does not extend Obj so that, for example, we can prevent Relations from being used as source and target objects.
//  However, we generally refer to Obj and Relation instances as "objects",
//  and many API methods accept both Obj.Unknown and Relation.Unknown (i.e., Entity.Unknown) instances.

export const Kind = internal.EntityKind;
export type Kind = internal.EntityKind;
export const KindSchema = internal.EntityKindSchema;

/**
 * Assigns a kind to an Object or Relation instance.
 * NOTE: Needed to make `isRelation` and `isObject` checks work.
 */
export interface OfKind<K extends Kind> {
  readonly [KindId]: K;
  readonly id: EntityId;
}

/**
 * Assigns a snapshot kind to an Object or Relation snapshot.
 */
export interface SnapshotOfKind<K extends Kind> {
  readonly [SnapshotKindId]: K;
  readonly id: EntityId;
}

/**
 * Obj or Relation with a specific set of properties.
 */
export type Entity<Props> = OfKind<Kind> & Props;

/**
 * Unknown Obj or Relation (reactive).
 */
export interface Unknown extends OfKind<Kind> {}

/**
 * Effect Schema for any ECHO entity (object or relation).
 *
 * Kind-agnostic counterpart to `Obj.Unknown` / `Relation.Unknown` — validates
 * the structural shape (id + properties) without constraining `[KindId]`. Used
 * in operation input schemas that accept any entity flavour (e.g.
 * `Schema.Array(Entity.Unknown)`).
 *
 * The cast bridges the runtime structural schema to the branded `Unknown` type:
 * `[KindId]` is a symbol brand that can't be expressed in a runtime `Struct`,
 * so the entity guarantee is carried at the type level only (same approach as
 * `Obj.Unknown` / `Relation.Unknown`). Unlike those, this is kind-agnostic so it
 * isn't an `UnknownTypeSchema<_, K>` (there's no single `K`) and carries no
 * `TypeAnnotation`.
 */
export const Unknown: Schema.Schema<Unknown> = Schema.Struct({
  id: Schema.String,
}).pipe(
  Schema.extend(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
) as unknown as Schema.Schema<Unknown>;

/**
 * Snapshot of an Obj or Relation.
 * Branded with SnapshotKindId instead of KindId.
 */
export interface Snapshot extends SnapshotOfKind<Kind> {}

/**
 * Object with arbitrary properties.
 *
 * NOTE: Due to how typescript works, this type is not assignable to a specific schema type.
 * In that case, use `Obj.instanceOf` to check if an object is of a specific type.
 *
 * This type is very permissive and allows accessing any property on the object.
 * We should move to Obj.Unknown that is not permissive and requires explicit instanceof checks..
 */
export interface Any extends OfKind<Kind> {
  [key: string]: unknown;
}

/**
 * Returns all properties of an object or relation except for the id and kind.
 */
export type Properties<T> = Omit<T, 'id' | KindId | Relation.Source | Relation.Target>;

/**
 * Check if a value is an ECHO entity (object or relation).
 * Returns `false` for snapshots.
 */
export const isEntity: (value: unknown) => value is Unknown = internal.isEntity;

/**
 * Test if a value is an instance of a given object or relation type.
 *
 * Kind-agnostic counterpart to `Obj.instanceOf` / `Relation.instanceOf` —
 * use this when the caller's input type is `Type.AnyObj | Type.AnyRelation`.
 *
 * @example
 * ```ts
 * // Caller doesn't know whether `type` is object- or relation-kind.
 * const matches = <T extends Type.AnyObj | Type.AnyRelation>(type: T, value: unknown) =>
 *   Entity.instanceOf(type, value);
 * ```
 */
export const instanceOf: {
  <S extends Type.AnyEntity>(schema: S): (value: unknown) => value is Type.InstanceType<S>;
  <S extends Type.AnyEntity>(schema: S, value: unknown): value is Type.InstanceType<S>;
} = ((...args: [schema: Type.AnyEntity, value?: unknown]) => {
  if (args.length === 1) {
    return (entity: unknown) => internal.isInstanceOf(args[0], entity);
  }
  return internal.isInstanceOf(args[0], args[1]);
}) as any;

/**
 * Check if a value is an ECHO entity snapshot.
 * Returns `false` for entities.
 */
export const isSnapshot = (value: unknown): value is Snapshot => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (value as any)[SnapshotKindId] !== undefined;
};

// TODO(dmaretskyi): Type introspection -- move to kind.
export const getKind = internal.getEntityKind;

/**
 * Property that accesses metadata for an entity.
 */
export const Meta: unique symbol = internal.MetaId as any;

/**
 * Property that accesses metadata for an entity.
 */
export type Meta = typeof Meta;

//
// Entity-level functions that work on any entity (object or relation).
// Use these when you don't know or care about the specific entity kind.
// For kind-specific functions, use Obj.* or Relation.*.
//

/**
 * JSON representation of an entity.
 */
export type JSON = internal.ObjectJSON;

/**
 * Whether the entity is a type-kind entity (a `Type.Type` produced by
 * `Type.makeObject` / `Type.makeRelation`, or a persisted schema). Type entities
 * carry their identity (typename/version) on themselves rather than referencing a
 * separate type, so the accessors below route them through the `Type.*` module.
 */
const isTypeEntity = (entity: unknown): boolean => internal.getEntityKindBrand(entity) === internal.EntityKind.Type;

/**
 * Any value the read accessors operate on: a reactive entity or a snapshot.
 * Type entities (`Type.AnyEntity`) are also accepted — they're first-class
 * entities, and `Unknown`'s kind-agnostic brand already subsumes them.
 */
export type AnyInput = Unknown | Snapshot;

/**
 * Get the canonical URI of an entity (object, relation, or type). Returns `URI.URI` —
 * an `EID` for object/relation instances and persisted types, or a typename
 * `DXN` for static type entities; narrow with `EID.parse(uri)` or
 * `DXN.tryMake(uri)` at the point of use.
 *
 * @param options.prefer - Controls the URI form (see {@link internal.GetURIOptions}).
 */
export const getURI = (entity: AnyInput, options?: internal.GetURIOptions): URI.URI =>
  isTypeEntity(entity) ? Type.getURI(entity as Type.AnyEntity) : internal.getUri(entity as Unknown, options);

/**
 * Get the DXN of an entity's type. For object/relation instances this is the URI
 * of the type they were created from; for a type entity it is the URI of the
 * meta-type ({@link Type.Type}, `dxn:org.dxos.type.schema:0.1.0`).
 */
export const getTypeURI = (entity: AnyInput): URI.URI | undefined =>
  isTypeEntity(entity) ? Type.getURI(Type.Type) : internal.getTypeURI(entity as Unknown);

/**
 * Get the type entity (`Type.AnyEntity`) the instance was created from.
 *
 * Returns `undefined` when the entity's type isn't registered in this runtime
 * (e.g. a freshly deserialized snapshot whose type entity hasn't been wired
 * up yet, or an entity loaded from storage before its schema is known). To
 * get the Effect Schema from the returned entity, use `Type.getSchema(...)`.
 *
 * For a type entity, returns the meta-type {@link Type.Type} (a type entity's
 * type is "Type").
 */
export const getType = (entity: AnyInput): Type.AnyEntity | undefined =>
  isTypeEntity(entity) ? Type.Type : (internal.getType(entity) as Type.AnyEntity | undefined);

/**
 * Get the typename of an entity's type. For object/relation instances this is the
 * typename of the type they were created from; for a type entity it is the type's
 * own typename (e.g. `com.example.type.person`).
 */
export const getTypename = (entity: AnyInput): string | undefined =>
  isTypeEntity(entity) ? Type.getTypename(entity as Type.AnyEntity) : internal.getTypename(entity as Unknown);

/**
 * Get the database an entity belongs to.
 */
export const getDatabase = (entity: Unknown | Snapshot): any | undefined => internal.getDatabase(entity);

/**
 * Get the metadata for an entity.
 * Returns mutable meta when passed a mutable entity (inside change callback).
 * Returns read-only meta when passed a regular entity or snapshot.
 */
// TODO(wittjosiah): When passed a Snapshot, should return a snapshot of meta, not the live meta proxy.
export function getMeta(entity: Mutable<Unknown>): internal.EntityMeta;
export function getMeta(entity: Unknown | Snapshot): internal.ReadonlyMeta;
export function getMeta(entity: Unknown | Snapshot | Mutable<Unknown>): internal.EntityMeta | internal.ReadonlyMeta {
  return internal.getMetaChecked(entity);
}

/**
 * Get foreign keys for an entity from the specified source.
 */
export const getKeys = (entity: Unknown | Snapshot, source: string): ForeignKey[] => internal.getKeys(entity, source);

/**
 * Check if an entity is deleted.
 */
export const isDeleted = (entity: Unknown | Snapshot): boolean => internal.isDeleted(entity);

/**
 * Check if an entity is currently in a historical (time-travel) read mode.
 * Synchronous guard — use before mutating to avoid the time-travel write error.
 */
export const isTimeTraveling = (entity: Unknown | Snapshot): boolean => internal.isTimeTraveling(entity);

/**
 * Get the label of an entity.
 *
 * @param options.fallback `'typename'` returns the entity's typename when no
 *   label is set (e.g. `org.dxos.type.table`).
 */
export const getLabel = (entity: Unknown | Snapshot, options?: internal.GetLabelOptions): string | undefined =>
  internal.getLabel(entity, options);

/**
 * Set the label of an entity.
 * Must be called within an `Entity.update` / `Obj.update` / `Relation.update` callback.
 */
export const setLabel = (entity: Mutable<Unknown>, label: string): void => internal.setLabel(entity, label);

/**
 * Get the description of an entity.
 */
export const getDescription = (entity: Unknown | Snapshot): string | undefined => internal.getDescription(entity);

/**
 * Get the icon annotation for an entity (object or relation), resolved via its type-level
 * `IconAnnotation`. Returns the full `{ icon, hue }` annotation so callers can use both
 * the phosphor icon name and the suggested colour.
 */
export const getIcon = (entity: Unknown | Snapshot): internal.IconAnnotation | undefined => internal.getIcon(entity);

/**
 * Convert an entity to its JSON representation.
 */
export const toJSON = (entity: Unknown | Snapshot): JSON => internal.objectToJSON(entity);

/**
 * Subscribe to changes on an entity (object or relation).
 * @returns Unsubscribe function.
 */
export const subscribe = (
  entity: Unknown,
  callback: () => void,
  opts?: internal.SubscribeOptions,
): (() => void) => {
  return internal.subscribe(entity, callback, opts);
};

//
// Change
//

/**
 * Used to provide a mutable view of an entity within `Entity.update`.
 */
export type Mutable<T> = internal.Mutable<T>;

/**
 * Perform mutations on an entity (object or relation) within a change context.
 *
 * Entities are read-only by default. Mutations are batched and notifications fire
 * when the callback completes. Direct mutations outside of `Entity.update` will throw
 * at runtime.
 *
 * @param entity - The echo entity (object or relation) to mutate.
 * @param callback - Receives a mutable view of the entity. All mutations must occur here.
 *
 * @example
 * ```typescript
 * // Mutate within Entity.update
 * Entity.update(entity, (obj) => {
 *   obj.name = 'Updated';
 *   obj.count = 42;
 * });
 *
 * // Direct mutation throws
 * entity.name = 'Bob'; // Error: Cannot modify outside Entity.update()
 * ```
 *
 * Note: For type-specific operations, prefer `Obj.update` or `Relation.update`.
 */
export const update = <T extends Unknown>(entity: T, callback: internal.ChangeCallback<T>): void => {
  internal.change(entity, callback);
};

/**
 * Add a tag to an entity.
 * Must be called within an `Entity.update`, `Obj.update`, or `Relation.update` callback.
 */
export const addTag = (entity: Mutable<Unknown>, tag: Ref.Ref<Tag.Tag>): void => internal.addTag(entity, tag);

/**
 * Remove a tag from an entity.
 * Must be called within an `Entity.update`, `Obj.update`, or `Relation.update` callback.
 */
export const removeTag = (entity: Mutable<Unknown>, tag: Ref.Ref<Tag.Tag>): void => internal.removeTag(entity, tag);

//
// Atoms
//

export const atom = objInternal.makeEntity;
export const labelAtom = objInternal.makeLabelAtom;
export const labelProperty = internal.getLabelProperty;

/**
 * Reactive atom reflecting whether an entity is currently time-traveling.
 * Drives read-only UI; re-evaluates on time-travel transitions and only propagates when it flips.
 */
export const timeTravelAtom = objInternal.makeTimeTravelAtom;
