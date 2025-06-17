//
// Copyright 2025 DXOS.org
//

import type { Schema } from 'effect';

import type { ForeignKey } from '@dxos/echo-protocol';
import type { DXN, ObjectId } from '@dxos/keys';

import type { ObjectMeta } from './meta';
import type { EntityKind } from '../ast';

//
// Defines the internal model of the echo object.
//

/**
 * Entity kind.
 */
export const EntityKindId = Symbol('@dxos/echo/EntityKind');

/**
 * DXN to the object itself.
 */
export const SelfDXNId = Symbol('@dxos/echo/Self');

/**
 * Property name for self DXN when object is serialized to JSON.
 */
export const ATTR_SELF_DXN = '@self';

/**
 * DXN to the object type.
 */
export const TypeId = Symbol('@dxos/echo/Type');

/**
 * Property name for typename when object is serialized to JSON.
 */
export const ATTR_TYPE = '@type';

/**
 * Reference to the object schema.
 */
export const SchemaId = Symbol('@dxos/echo/Schema');

/**
 * Deletion marker.
 */
export const DeletedId = Symbol('@dxos/echo/Deleted');

/**
 * Property name for deleted when object is serialized to JSON.
 */
export const ATTR_DELETED = '@deleted';

/**
 * Metadata section.
 */
export const MetaId = Symbol('@dxos/echo/Meta');

/**
 * Property name for meta when object is serialized to JSON.
 */
export const ATTR_META = '@meta';

/**
 * Used to access relation source ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
export const RelationSourceId: unique symbol = Symbol('@dxos/echo/RelationSource');

/**
 * Property name for relation source when object is serialized to JSON.
 */
export const ATTR_RELATION_SOURCE = '@relationSource';

/**
 * Used to access relation target ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
export const RelationTargetId: unique symbol = Symbol('@dxos/echo/RelationTarget');

/**
 * Property name for relation target when object is serialized to JSON.
 */
export const ATTR_RELATION_TARGET = '@relationTarget';

/**
 * Reference to the database the object belongs to.
 */
export const DatabaseId = Symbol('@dxos/echo/Database');

/**
 * Reference to the hypergraph the object belongs to.
 */
export const HypergraphId = Symbol('@dxos/echo/Hypergraph');

/**
 * Internal runtime representation of an object.
 * The fields are accessed through getter functions.
 */
export interface InternalObjectProps {
  id: ObjectId;
  readonly [SelfDXNId]?: DXN;
  readonly [TypeId]: DXN;
  /**
   * Returns the schema for the object.
   */
  readonly [SchemaId]?: Schema.Schema.AnyNoContext;
  readonly [EntityKindId]: EntityKind;
  readonly [RelationSourceId]?: DXN | InternalObjectProps;
  readonly [RelationTargetId]?: DXN | InternalObjectProps;
  readonly [DeletedId]?: boolean;
  readonly [MetaId]?: ObjectMeta;
  readonly [DatabaseId]?: DXN;
  readonly [HypergraphId]?: DXN;
}

/**
 * JSON representation of an object or relation.
 */
export interface ObjectJSON {
  id: string;
  [ATTR_SELF_DXN]?: DXN.String;
  [ATTR_TYPE]: DXN.String;
  [ATTR_RELATION_SOURCE]?: DXN.String;
  [ATTR_RELATION_TARGET]?: DXN.String;
  [ATTR_DELETED]?: boolean;
  [ATTR_META]?: ObjectMetaJSON;
}

export interface ObjectMetaJSON {
  keys: ForeignKey[];
}
