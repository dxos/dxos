//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { type ForeignKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type EchoId, ObjectId, type URI } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import type * as Database from '../../Database';
import {
  type ATTR_META,
  type ATTR_PARENT,
  type ATTR_TYPE,
  ATTR_DELETED,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_SELF_DXN,
  EntityKind,
  KindId,
  type MetaId,
  ObjectDatabaseId,
  ObjectDeletedId,
  type ObjectMeta,
  ObjectVersionId,
  type ParentId,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  type SchemaId,
  SelfDXNId,
  TypeId,
  type Version,
} from '../common/types';

export { ATTR_DELETED, ATTR_SELF_DXN, ObjectDatabaseId, ObjectDeletedId, ObjectVersionId, SelfDXNId };

/**
 * Internal runtime representation of an object.
 * The fields are accessed through getter functions.
 */
// NOTE: Each symbol has a jsdoc describing its purpose.
export interface InternalObjectProps {
  readonly id: ObjectId;
  readonly [SelfDXNId]: EchoId.EchoId;
  readonly [KindId]: EntityKind;
  readonly [SchemaId]: Schema.Schema.AnyNoContext;
  readonly [TypeId]: URI.URI;
  readonly [MetaId]?: ObjectMeta;
  [ParentId]?: InternalObjectProps;
  readonly [ObjectDatabaseId]?: Database.Database;
  readonly [ObjectDeletedId]?: boolean;
  readonly [ObjectVersionId]?: Version;
  readonly [RelationSourceDXNId]?: EchoId.EchoId;
  readonly [RelationTargetDXNId]?: EchoId.EchoId;
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
  [ATTR_TYPE]: URI.URI;
  [ATTR_SELF_DXN]?: EchoId.EchoId;
  [ATTR_PARENT]?: EchoId.EchoId; // Encoded reference
  [ATTR_DELETED]?: boolean;
  [ATTR_META]?: ObjectMetaJSON;
  [ATTR_RELATION_SOURCE]?: EchoId.EchoId;
  [ATTR_RELATION_TARGET]?: EchoId.EchoId;

  /**
   * Application-specific properties.
   */
  [key: string]: unknown;
}

/**
 * NOTE: Keep as `function` to avoid type inference issues.
 */
export function assertObjectModel(obj: unknown): asserts obj is InternalObjectProps {
  invariant(typeof obj === 'object' && obj !== null, 'Invalid object model: not an object');
  assumeType<InternalObjectProps>(obj);
  invariant(ObjectId.isValid(obj.id), 'Invalid object model: invalid id');
  invariant(obj[TypeId] === undefined || typeof obj[TypeId] === 'string', 'Invalid object model: invalid type');
  invariant(
    obj[KindId] === EntityKind.Object || obj[KindId] === EntityKind.Relation,
    'Invalid object model: invalid entity kind',
  );

  if (obj[KindId] === EntityKind.Relation) {
    invariant(typeof obj[RelationSourceDXNId] === 'string', 'Invalid object model: invalid relation source');
    invariant(typeof obj[RelationTargetDXNId] === 'string', 'Invalid object model: invalid relation target');
    invariant(typeof obj[RelationSourceId] !== 'string', 'Invalid object model: source pointer is a DXN');
    invariant(typeof obj[RelationTargetId] !== 'string', 'Invalid object model: target pointer is a DXN');
  }
}
