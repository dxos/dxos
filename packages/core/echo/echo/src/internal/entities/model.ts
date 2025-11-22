//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { type ForeignKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import {
  type ATTR_META,
  type ATTR_TYPE,
  EntityKind,
  EntityKindId,
  type MetaId,
  type ObjectMeta,
  type SchemaId,
  TypeId,
  type Version,
} from '../types';

import {
  type ATTR_RELATION_SOURCE,
  type ATTR_RELATION_TARGET,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
} from './relation';

//
// Defines the internal model of the echo object.
//

/**
 * DXN to the object itself.
 */
export const SelfDXNId = Symbol.for('@dxos/echo/DXN');

/**
 * Property name for self DXN when object is serialized to JSON.
 */
export const ATTR_SELF_DXN = '@dxn';

/**
 * Object version.
 */
export const ObjectVersionId: unique symbol = Symbol.for('@dxos/echo/ObjectVersion');

/**
 * Deletion marker.
 */
export const DeletedId = Symbol.for('@dxos/echo/Deleted');

/**
 * Property name for deleted when object is serialized to JSON.
 */
export const ATTR_DELETED = '@deleted';

/**
 * Internal runtime representation of an object.
 * The fields are accessed through getter functions.
 *
 * @internal
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
 * @internal
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

/**
 * @internal
 */
export interface ObjectMetaJSON {
  keys: ForeignKey[];
  tags?: string[];
}

/**
 * NOTE: Keep as `function` to avoid type inference issues.
 */
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
