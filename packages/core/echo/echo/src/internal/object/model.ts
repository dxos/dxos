//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import { type ForeignKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import { EntityKind } from '../ast';

import { type ObjectMeta } from './meta';
import type { Version } from './version';

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
export const SelfDXNId = Symbol('@dxos/echo/DXN');

/**
 * Property name for self DXN when object is serialized to JSON.
 */
export const ATTR_SELF_DXN = '@dxn';

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
export const RelationSourceDXNId: unique symbol = Symbol('@dxos/echo/RelationSourceDXN');

/**
 * Property name for relation source when object is serialized to JSON.
 */
export const ATTR_RELATION_SOURCE = '@relationSource';

/**
 * Used to access relation target ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
export const RelationTargetDXNId: unique symbol = Symbol('@dxos/echo/RelationTargetDXN');

/**
 * Property name for relation target when object is serialized to JSON.
 */
export const ATTR_RELATION_TARGET = '@relationTarget';

/**
 * Used to access relation source ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
export const RelationSourceId: unique symbol = Symbol('@dxos/echo/RelationSource');

/**
 * Used to access relation target ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
export const RelationTargetId: unique symbol = Symbol('@dxos/echo/RelationTarget');

/**
 * Getter to get object version.
 */
export const ObjectVersionId: unique symbol = Symbol('@dxos/echo/ObjectVersion');

/**
 * Internal runtime representation of an object.
 * The fields are accessed through getter functions.
 */
export interface InternalObjectProps {
  id: ObjectId;
  readonly [SelfDXNId]?: DXN;

  // Echo supports untyped objects O_O.
  readonly [TypeId]?: DXN;

  /**
   * Returns the schema for the object.
   */
  readonly [SchemaId]?: Schema.Schema.AnyNoContext;
  readonly [EntityKindId]: EntityKind;
  readonly [DeletedId]?: boolean;
  readonly [MetaId]?: ObjectMeta;
  readonly [RelationSourceDXNId]?: DXN;
  readonly [RelationTargetDXNId]?: DXN;
  readonly [RelationSourceId]?: InternalObjectProps;
  readonly [RelationTargetId]?: InternalObjectProps;
  readonly [ObjectVersionId]?: Version;
}

/**
 * JSON representation of an object or relation.
 */
export interface ObjectJSON {
  id: string;
  [ATTR_SELF_DXN]?: DXN.String;
  [ATTR_TYPE]: DXN.String;
  [ATTR_DELETED]?: boolean;
  [ATTR_META]?: ObjectMetaJSON;
  [ATTR_RELATION_SOURCE]?: DXN.String;
  [ATTR_RELATION_TARGET]?: DXN.String;
}

export interface ObjectMetaJSON {
  keys: ForeignKey[];
  tags?: string[];
}

// NOTE: Keep as `function` to avoid type inference issues.
// eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions
export function assertObjectModelShape(obj: unknown): asserts obj is InternalObjectProps {
  invariant(typeof obj === 'object' && obj !== null, 'Invalid object model: not an object');
  assumeType<InternalObjectProps>(obj);
  invariant(ObjectId.isValid(obj.id), 'Invalid object model: invalid id');
  invariant(obj[TypeId] === undefined || obj[TypeId] instanceof DXN, 'Invalid object model: invalid type');
  invariant(
    obj[EntityKindId] === EntityKind.Object || obj[EntityKindId] === EntityKind.Relation,
    'Invalid object model: invalid entity kind',
  );
  if (obj[EntityKindId] === EntityKind.Relation) {
    invariant(obj[RelationSourceDXNId] instanceof DXN, 'Invalid object model: invalid relation source');
    invariant(obj[RelationTargetDXNId] instanceof DXN, 'Invalid object model: invalid relation target');
    invariant(!(obj[RelationSourceId] instanceof DXN), 'Invalid object model: source pointer is a DXN');
    invariant(!(obj[RelationTargetId] instanceof DXN), 'Invalid object model: target pointer is a DXN');
  }
}
