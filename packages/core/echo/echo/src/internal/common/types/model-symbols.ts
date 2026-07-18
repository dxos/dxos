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
 * Time-travel state accessor symbol. Resolves to `true` while the entity is in a historical read
 * mode (pinned via `setTimeTravel`), so callers can guard mutations and derive read-only UI.
 */
export const TimeTravelingId: unique symbol = Symbol.for('@dxos/echo/TimeTraveling');

/**
 * Object database accessor symbol.
 */
export const ObjectDatabaseId = Symbol.for('@dxos/echo/Database');

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
