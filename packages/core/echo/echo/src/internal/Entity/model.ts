//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { type ForeignKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { EchoURI, ObjectId, type URI } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import type * as Database from '../../Database';
import {
  type ATTR_META,
  type ATTR_PARENT,
  type ATTR_TYPE,
  ATTR_DELETED,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_SELF_URI,
  ATTR_SELF_URI_LEGACY,
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
  SelfURIId,
  TypeId,
  type Version,
} from '../common/types';

export {
  ATTR_DELETED,
  ATTR_SELF_URI,
  ATTR_SELF_URI_LEGACY,
  ObjectDatabaseId,
  ObjectDeletedId,
  ObjectVersionId,
  SelfURIId,
};

/**
 * Internal runtime representation of an object.
 * The fields are accessed through getter functions.
 */
// NOTE: Each symbol has a jsdoc describing its purpose.
export interface InternalObjectProps {
  readonly id: ObjectId;
  readonly [SelfURIId]: EchoURI.EchoURI;
  readonly [KindId]: EntityKind;
  readonly [SchemaId]: Schema.Schema.AnyNoContext;
  readonly [TypeId]: URI.URI;
  readonly [MetaId]?: ObjectMeta;
  [ParentId]?: InternalObjectProps;
  readonly [ObjectDatabaseId]?: Database.Database;
  readonly [ObjectDeletedId]?: boolean;
  readonly [ObjectVersionId]?: Version;
  readonly [RelationSourceDXNId]?: EchoURI.EchoURI;
  readonly [RelationTargetDXNId]?: EchoURI.EchoURI;
  readonly [RelationSourceId]?: InternalObjectProps;
  readonly [RelationTargetId]?: InternalObjectProps;
}

/**
 * Entity metadata.
 */
export interface ObjectMetaJSON {
  keys: ForeignKey[];
  tags?: string[];
  key?: string;
  version?: string;
}

/**
 * JSON representation of an object or relation metadata.
 */
export interface ObjectJSON {
  id: ObjectId;
  [ATTR_TYPE]?: URI.URI;
  [ATTR_SELF_URI]?: EchoURI.EchoURI;
  [ATTR_PARENT]?: EchoURI.EchoURI; // Encoded reference
  [ATTR_DELETED]?: boolean;
  [ATTR_META]?: ObjectMetaJSON;
  [ATTR_RELATION_SOURCE]?: EchoURI.EchoURI;
  [ATTR_RELATION_TARGET]?: EchoURI.EchoURI;

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
    invariant(EchoURI.isEchoURI(obj[RelationSourceDXNId]), 'Invalid object model: invalid relation source');
    invariant(EchoURI.isEchoURI(obj[RelationTargetDXNId]), 'Invalid object model: invalid relation target');
    invariant(!EchoURI.isEchoURI(obj[RelationSourceId]), 'Invalid object model: source pointer is a DXN');
    invariant(!EchoURI.isEchoURI(obj[RelationTargetId]), 'Invalid object model: target pointer is a DXN');
  }
}
