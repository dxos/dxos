//
// Copyright 2025 DXOS.org
//

// TODO(rename): These internal entity-wide symbols/types still use the `Object*` prefix but apply
// to all entities (objects AND relations). Rename to `Entity*` in a follow-up pass (deferred from the
// EchoURI→EID / ObjectId→EntityId / ObjectMeta→EntityMeta rename, which covered only public SDK API):
//   ObjectCore, ObjectInternals, ObjectVersion, ObjectVersionId, ObjectDeletedId, ObjectDatabaseId,
//   ObjectLoader, ObjectDocumentLoaded, ObjectUnavailable.
// (ObjectMigration / ObjectMigrationContext intentionally excluded — object-only, not entity-wide.)

/**
 * Internal symbol/string constants for the echo object model.
 * Defined in common/ so proxy/ can use them without importing from Entity/.
 * Entity/ re-exports these for external consumers.
 */

/**
 * Property name for the object's own URI when serialized to JSON.
 */
export const ATTR_SELF_URI = '@uri';

/**
 * @deprecated Legacy JSON property name accepted on read for backward compat.
 */
export const ATTR_SELF_URI_LEGACY = '@dxn';

/**
 * Symbol carrying the object's own URI on live entities.
 */
export const SelfURIId = Symbol.for('@dxos/echo/URI');

/**
 * Property name for deleted when object is serialized to JSON.
 */
export const ATTR_DELETED = '@deleted';

/**
 * Deletion marker.
 */
export const ObjectDeletedId = Symbol.for('@dxos/echo/Deleted');

/**
 * Object version accessor symbol.
 */
export const ObjectVersionId: unique symbol = Symbol.for('@dxos/echo/Version');

/**
 * Object database accessor symbol.
 */
export const ObjectDatabaseId = Symbol.for('@dxos/echo/Database');

/**
 * Branch accessor symbol. Resolves to the branch name this object instance is bound to (`'main'` for
 * the canonical object, or the branch of a `db.branch()` independent instance). Read via `Obj.getBranch`.
 */
export const ObjectBranchId = Symbol.for('@dxos/echo/Branch');

/**
 * Device-state accessor symbol. Resolves to the {@link EntityDeviceState} of a live ECHO object, which
 * can hold values on this device only (held in memory until the object joins a database); absent on
 * every other entity.
 */
export const ObjectDeviceStateId = Symbol.for('@dxos/echo/DeviceState');

/**
 * Values an entity keeps on this device only, outside its replicated document.
 */
export interface EntityDeviceState {
  /** Encoded values of the entity's device-scoped annotations, by annotation key. */
  getAnnotations(): Readonly<Record<string, unknown>>;
  /** Writes an encoded device-scoped annotation value; `undefined` deletes it. */
  setAnnotation(key: string, value: unknown): void;
}

/**
 * Property name for relation source when object is serialized to JSON.
 */
export const ATTR_RELATION_SOURCE = '@relationSource';

/**
 * Used to access relation source ref on live ECHO objects.
 */
export const RelationSourceId: unique symbol = Symbol.for('@dxos/echo/RelationSource');

/**
 * Used to access relation source DXN on live ECHO objects.
 */
export const RelationSourceDXNId: unique symbol = Symbol.for('@dxos/echo/RelationSourceDXN');

/**
 * Property name for relation target when object is serialized to JSON.
 */
export const ATTR_RELATION_TARGET = '@relationTarget';

/**
 * Used to access relation target ref on live ECHO objects.
 */
export const RelationTargetId: unique symbol = Symbol.for('@dxos/echo/RelationTarget');

/**
 * Used to access relation target DXN on live ECHO objects.
 */
export const RelationTargetDXNId: unique symbol = Symbol.for('@dxos/echo/RelationTargetDXN');

/**
 * Symbol carrying the entity metadata (EntityMeta) on live ECHO entities.
 * Must be importable by both meta.ts (which depends on the Ref schema) and
 * Entity/api.ts (which is transitively imported by the Ref schema), so it
 * cannot live in either of those files without creating an import cycle.
 */
export const MetaId = Symbol.for('@dxos/echo/Meta');
