//
// Copyright 2025 DXOS.org
//

import type { ForeignKey } from '@dxos/echo-protocol';
import type { DXN, ObjectId } from '@dxos/keys';

import {
  type ChangeCallback,
  EntityKind,
  EntityKindSchema,
  KindId,
  type Mutable,
  type ObjectJSON,
  type ObjectMeta,
  type ReadonlyMeta,
  SnapshotKindId,
  addTag as addTag$,
  change as change$,
  getDXN as getDXN$,
  getDatabase as getDatabase$,
  getDescription as getDescription$,
  getEntityKind,
  getKeys as getKeys$,
  getLabel as getLabel$,
  getMetaChecked as getMeta$,
  getTypeDXN as getTypeDXN$,
  getTypename as getTypename$,
  isDeleted as isDeleted$,
  removeTag as removeTag$,
  subscribe as subscribe$,
  objectToJSON as toJSON$,
} from './internal';

// Re-export KindId and SnapshotKindId from internal.
export { KindId, SnapshotKindId };

// NOTE: Relation does not extend Obj so that, for example, we can prevent Relations from being used as source and target objects.
//  However, we generally refer to Obj and Relation instances as "objects",
//  and many API methods accept both Obj.Unknown and Relation.Unknown (i.e., Entity.Unknown) instances.

export const Kind = EntityKind;
export type Kind = EntityKind;
export const KindSchema = EntityKindSchema;

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

export const getKind = getEntityKind;

//
// Entity-level functions that work on any entity (object or relation).
// Use these when you don't know or care about the specific entity kind.
// For kind-specific functions, use Obj.* or Relation.*.
//

/**
 * JSON representation of an entity.
 */
export type JSON = ObjectJSON;

/**
 * Get the DXN of an entity (object or relation).
 */
export const getDXN = (entity: Unknown | Snapshot): DXN => getDXN$(entity);

/**
 * Get the DXN of an entity's type.
 */
export const getTypeDXN = getTypeDXN$;

/**
 * Get the typename of an entity's type.
 */
export const getTypename = (entity: Unknown | Snapshot): string | undefined => getTypename$(entity);

/**
 * Get the database an entity belongs to.
 */
export const getDatabase = (entity: Unknown | Snapshot): any | undefined => getDatabase$(entity);

/**
 * Get the metadata for an entity.
 * Returns mutable meta when passed a mutable entity (inside change callback).
 * Returns read-only meta when passed a regular entity or snapshot.
 */
// TODO(wittjosiah): When passed a Snapshot, should return a snapshot of meta, not the live meta proxy.
export function getMeta(entity: Mutable<Unknown>): ObjectMeta;
export function getMeta(entity: Unknown | Snapshot): ReadonlyMeta;
export function getMeta(entity: Unknown | Snapshot | Mutable<Unknown>): ObjectMeta | ReadonlyMeta {
  return getMeta$(entity);
}

/**
 * Get foreign keys for an entity from the specified source.
 */
export const getKeys = (entity: Unknown | Snapshot, source: string): ForeignKey[] => getKeys$(entity, source);

/**
 * Check if an entity is deleted.
 */
export const isDeleted = (entity: Unknown | Snapshot): boolean => isDeleted$(entity);

/**
 * Get the label of an entity.
 */
export const getLabel = (entity: Unknown | Snapshot): string | undefined => getLabel$(entity);

/**
 * Get the description of an entity.
 */
export const getDescription = (entity: Unknown | Snapshot): string | undefined => getDescription$(entity);

/**
 * Convert an entity to its JSON representation.
 */
export const toJSON = (entity: Unknown | Snapshot): JSON => toJSON$(entity);

/**
 * Subscribe to changes on an entity (object or relation).
 * @returns Unsubscribe function.
 */
export const subscribe = (entity: Unknown, callback: () => void): (() => void) => {
  return subscribe$(entity, callback);
};

//
// Change
//

/**
 * Used to provide a mutable view of an entity within `Entity.change`.
 */
export type { Mutable };

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
 * Entity.change(entity, (e) => {
 *   e.name = 'Updated';
 *   e.count = 42;
 * });
 *
 * // Direct mutation throws
 * entity.name = 'Bob'; // Error: Cannot modify outside Entity.change()
 * ```
 *
 * Note: For type-specific operations, prefer `Obj.change` or `Relation.change`.
 */
export const change = <T extends Unknown>(entity: T, callback: ChangeCallback<T>): void => {
  change$(entity, callback);
};

/**
 * Add a tag to an entity.
 * Must be called within an `Entity.change`, `Obj.change`, or `Relation.change` callback.
 */
export const addTag = (entity: Mutable<Unknown>, tag: string): void => addTag$(entity, tag);

/**
 * Remove a tag from an entity.
 * Must be called within an `Entity.change`, `Obj.change`, or `Relation.change` callback.
 */
export const removeTag = (entity: Mutable<Unknown>, tag: string): void => removeTag$(entity, tag);
