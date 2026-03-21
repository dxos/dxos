//
// Copyright 2025 DXOS.org
//

/**
 * Internal symbol/string constants for the echo object model.
 * Defined in common/ so proxy/ can use them without importing from Entity/.
 * Entity/ re-exports these for external consumers.
 */

/**
 * Property name for self DXN when object is serialized to JSON.
 */
export const ATTR_SELF_DXN = '@dxn';

/**
 * DXN to the object itself.
 */
export const SelfDXNId = Symbol.for('@dxos/echo/DXN');

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
 * Object timestamps accessor symbol (createdAt / updatedAt from index).
 */
export const ObjectTimestampsId: unique symbol = Symbol.for('@dxos/echo/Timestamps');
