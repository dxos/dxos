//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type { ForeignKey } from '@dxos/echo-protocol';
import type { DXN, ObjectId } from '@dxos/keys';

import * as internal from './internal';
import type * as Relation from './Relation';

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
  readonly id: ObjectId;
}

/**
 * Assigns a snapshot kind to an Object or Relation snapshot.
 */
export interface SnapshotOfKind<K extends Kind> {
  readonly [SnapshotKindId]: K;
  readonly id: ObjectId;
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
export const isEntity = (value: unknown): value is Unknown => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (value as any)[KindId] !== undefined;
};

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
 * Get the DXN of an entity (object or relation).
 */
export const getDXN = (entity: Unknown | Snapshot): DXN => internal.getDXN(entity);

/**
 * Get the DXN of an entity's type.
 */
export const getTypeDXN = internal.getTypeDXN;

/**
 * Get the typename of an entity's type.
 */
export const getTypename = (entity: Unknown | Snapshot): string | undefined => internal.getTypename(entity);

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
export function getMeta(entity: Mutable<Unknown>): internal.ObjectMeta;
export function getMeta(entity: Unknown | Snapshot): internal.ReadonlyMeta;
export function getMeta(entity: Unknown | Snapshot | Mutable<Unknown>): internal.ObjectMeta | internal.ReadonlyMeta {
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
 * Get the label of an entity.
 */
export const getLabel = (entity: Unknown | Snapshot): string | undefined => internal.getLabel(entity);

/**
 * Get the description of an entity.
 */
export const getDescription = (entity: Unknown | Snapshot): string | undefined => internal.getDescription(entity);

/**
 * Convert an entity to its JSON representation.
 */
export const toJSON = (entity: Unknown | Snapshot): JSON => internal.objectToJSON(entity);

/**
 * Subscribe to changes on an entity (object or relation).
 * @returns Unsubscribe function.
 */
export const subscribe = (entity: Unknown, callback: () => void): (() => void) => {
  return internal.subscribe(entity, callback);
};

//
// Change
//

/**
 * Used to provide a mutable view of an entity within `Entity.change`.
 */
export type Mutable<T> = internal.Mutable<T>;

/**
 * Perform mutations on an entity (object or relation) within a change context.
 *
 * Entities are read-only by default. Mutations are batched and notifications fire
 * when the callback completes. Direct mutations outside of `Entity.change` will throw
 * at runtime.
 *
 * @param entity - The echo entity (object or relation) to mutate.
 * @param callback - Receives a mutable view of the entity. All mutations must occur here.
 *
 * @example
 * ```typescript
 * // Mutate within Entity.change
 * Entity.change(entity, (obj) => {
 *   obj.name = 'Updated';
 *   obj.count = 42;
 * });
 *
 * // Direct mutation throws
 * entity.name = 'Bob'; // Error: Cannot modify outside Entity.change()
 * ```
 *
 * Note: For type-specific operations, prefer `Obj.change` or `Relation.change`.
 */
export const change = <T extends Unknown>(entity: T, callback: internal.ChangeCallback<T>): void => {
  internal.change(entity, callback);
};

/**
 * Add a tag to an entity.
 * Must be called within an `Entity.change`, `Obj.change`, or `Relation.change` callback.
 */
export const addTag = (entity: Mutable<Unknown>, tag: string): void => internal.addTag(entity, tag);

/**
 * Remove a tag from an entity.
 * Must be called within an `Entity.change`, `Obj.change`, or `Relation.change` callback.
 */
export const removeTag = (entity: Mutable<Unknown>, tag: string): void => internal.removeTag(entity, tag);
