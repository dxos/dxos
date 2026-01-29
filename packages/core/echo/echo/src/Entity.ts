//
// Copyright 2025 DXOS.org
//

import type { ForeignKey } from '@dxos/echo-protocol';
import type { DXN, ObjectId } from '@dxos/keys';

import {
  addTag as addTag$,
  type AnyEntity,
  type ObjectJSON,
  EntityKind,
  EntityKindSchema,
  getDatabase as getDatabase$,
  getDescription as getDescription$,
  getDXN as getDXN$,
  getKeys as getKeys$,
  getLabel as getLabel$,
  getMetaChecked as getMeta$,
  getTypeDXN as getTypeDXN$,
  getTypename as getTypename$,
  isDeleted as isDeleted$,
  KindId,
  type ReadonlyMeta,
  removeTag as removeTag$,
  SnapshotKindId,
  getEntityKind,
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
 */
// NOTE: Needed to make `isRelation` and `isObject` checks work.
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
 * Unbranded base type for entities - common structure without the brand.
 * Both reactive entities and snapshots are assignable to this.
 */
export interface Base extends AnyEntity {
  readonly id: ObjectId;
}

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
export const getDXN = (entity: Base): DXN => getDXN$(entity);

/**
 * Get the DXN of an entity's type.
 */
export const getTypeDXN = getTypeDXN$;

/**
 * Get the typename of an entity's type.
 */
export const getTypename = (entity: Base): string | undefined => getTypename$(entity);

/**
 * Get the database an entity belongs to.
 */
export const getDatabase = (entity: Base): any | undefined => getDatabase$(entity);

/**
 * Get the metadata for an entity.
 */
export const getMeta = (entity: Base): ReadonlyMeta => getMeta$(entity);

/**
 * Get foreign keys for an entity from the specified source.
 */
export const getKeys = (entity: Base, source: string): ForeignKey[] => getKeys$(entity, source);

/**
 * Check if an entity is deleted.
 */
export const isDeleted = (entity: Base): boolean => isDeleted$(entity);

/**
 * Get the label of an entity.
 */
export const getLabel = (entity: Base): string | undefined => getLabel$(entity);

/**
 * Get the description of an entity.
 */
export const getDescription = (entity: Base): string | undefined => getDescription$(entity);

/**
 * Convert an entity to its JSON representation.
 */
export const toJSON = (entity: Base): JSON => toJSON$(entity);

/**
 * Subscribe to changes on an entity (object or relation).
 * @returns Unsubscribe function.
 */
export const subscribe = (entity: Unknown, callback: () => void): (() => void) => {
  return subscribe$(entity, callback);
};

/**
 * Add a tag to an entity.
 * Only accepts reactive entities (not snapshots).
 */
export const addTag = (entity: Unknown, tag: string): void => addTag$(entity, tag);

/**
 * Remove a tag from an entity.
 * Only accepts reactive entities (not snapshots).
 */
export const removeTag = (entity: Unknown, tag: string): void => removeTag$(entity, tag);
