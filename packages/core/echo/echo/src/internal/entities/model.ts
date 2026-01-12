//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { type ForeignKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import type * as Database from '../../Database';
import {
  type ATTR_META,
  type ATTR_PARENT,
  type ATTR_TYPE,
  EntityKind,
  KindId,
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
 * Internal runtime representation of an object.
 * The fields are accessed through getter functions.
 */
// NOTE: Each symbol has a jsdoc describing its purpose.
export interface InternalObjectProps {
  readonly id: ObjectId;
  readonly [SelfDXNId]: DXN;
  readonly [KindId]: EntityKind;
  readonly [SchemaId]: Schema.Schema.AnyNoContext;
  readonly [TypeId]: DXN;
  readonly [MetaId]?: ObjectMeta;
  readonly [ObjectDatabaseId]?: Database.Database;
  readonly [ObjectDeletedId]?: boolean;
  readonly [ObjectVersionId]?: Version;
  readonly [RelationSourceDXNId]?: DXN;
  readonly [RelationTargetDXNId]?: DXN;
  readonly [RelationSourceId]?: InternalObjectProps;
  readonly [RelationTargetId]?: InternalObjectProps;
}

/**
 * Entity metadata.
 */
export interface ObjectMetaJSON {
  keys: ForeignKey[];
  tags?: string[];
}

/**
 * JSON representation of an object or relation metadata.
 */
export interface ObjectJSON {
  id: string;
  [ATTR_TYPE]: DXN.String;
  [ATTR_SELF_DXN]?: DXN.String;
  [ATTR_PARENT]?: string; // Encoded reference
  [ATTR_DELETED]?: boolean;
  [ATTR_META]?: ObjectMetaJSON;
  [ATTR_RELATION_SOURCE]?: DXN.String;
  [ATTR_RELATION_TARGET]?: DXN.String;
}

/**
 * NOTE: Keep as `function` to avoid type inference issues.
 */
export function assertObjectModel(obj: unknown): asserts obj is InternalObjectProps {
  invariant(typeof obj === 'object' && obj !== null, 'Invalid object model: not an object');
  assumeType<InternalObjectProps>(obj);
  invariant(ObjectId.isValid(obj.id), 'Invalid object model: invalid id');
  invariant(obj[TypeId] === undefined || obj[TypeId] instanceof DXN, 'Invalid object model: invalid type');
  invariant(
    obj[KindId] === EntityKind.Object || obj[KindId] === EntityKind.Relation,
    'Invalid object model: invalid entity kind',
  );

  if (obj[KindId] === EntityKind.Relation) {
    invariant(obj[RelationSourceDXNId] instanceof DXN, 'Invalid object model: invalid relation source');
    invariant(obj[RelationTargetDXNId] instanceof DXN, 'Invalid object model: invalid relation target');
    invariant(!(obj[RelationSourceId] instanceof DXN), 'Invalid object model: source pointer is a DXN');
    invariant(!(obj[RelationTargetId] instanceof DXN), 'Invalid object model: target pointer is a DXN');
  }
}
