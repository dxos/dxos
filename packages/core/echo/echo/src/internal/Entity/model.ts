//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { type ForeignKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { EID, EntityId, type URI } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import type * as Database from '../../Database';
import {
  ATTR_DELETED,
  type ATTR_PARENT,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_SELF_URI,
  ATTR_SELF_URI_LEGACY,
  type ATTR_TYPE,
  EntityKind,
  KindId,
  ObjectBranchId,
  ObjectDatabaseId,
  ObjectDeletedId,
  ObjectVersionId,
  type ParentId,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  type SchemaId,
  SelfURIId,
  TimeTravelingId,
  TypeId,
  type Version,
} from '../common/types';
import { type ATTR_META, type EntityMeta } from '../common/types/meta';
import { type MetaId } from '../common/types/model-symbols';

export {
  ATTR_DELETED,
  ATTR_SELF_URI,
  ATTR_SELF_URI_LEGACY,
  ObjectBranchId,
  ObjectDatabaseId,
  ObjectDeletedId,
  ObjectVersionId,
  SelfURIId,
  TimeTravelingId,
};

/**
 * Internal runtime representation of an object.
 * The fields are accessed through getter functions.
 */
// NOTE: Each symbol has a jsdoc describing its purpose.
export interface InternalObjectProps {
  readonly id: EntityId;
  readonly [SelfURIId]: EID.EID;
  readonly [KindId]: EntityKind;
  readonly [SchemaId]: Schema.Schema.AnyNoContext;
  readonly [TypeId]: URI.URI;
  readonly [MetaId]?: EntityMeta;
  [ParentId]?: InternalObjectProps;
  readonly [ObjectDatabaseId]?: Database.Database;
  readonly [ObjectBranchId]?: string;
  readonly [ObjectDeletedId]?: boolean;
  readonly [ObjectVersionId]?: Version;
  readonly [TimeTravelingId]?: boolean;
  readonly [RelationSourceDXNId]?: EID.EID;
  readonly [RelationTargetDXNId]?: EID.EID;
  readonly [RelationSourceId]?: InternalObjectProps;
  readonly [RelationTargetId]?: InternalObjectProps;
}

/**
 * Entity metadata.
 */
export interface EntityMetaJSON {
  keys: ForeignKey[];
  tags?: string[];
  key?: string;
  version?: string;
}

/**
 * JSON representation of an object or relation metadata.
 */
export interface ObjectJSON {
  id: EntityId;
  [ATTR_TYPE]?: URI.URI;
  [ATTR_SELF_URI]?: EID.EID;
  [ATTR_PARENT]?: EID.EID; // Encoded reference
  [ATTR_DELETED]?: boolean;
  [ATTR_META]?: EntityMetaJSON;
  [ATTR_RELATION_SOURCE]?: EID.EID;
  [ATTR_RELATION_TARGET]?: EID.EID;

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
  invariant(EntityId.isValid(obj.id), 'Invalid object model: invalid id');
  invariant(obj[TypeId] === undefined || typeof obj[TypeId] === 'string', 'Invalid object model: invalid type');
  invariant(
    obj[KindId] === EntityKind.Object || obj[KindId] === EntityKind.Relation || obj[KindId] === EntityKind.Type,
    'Invalid object model: invalid entity kind',
  );

  if (obj[KindId] === EntityKind.Relation) {
    invariant(EID.isEID(obj[RelationSourceDXNId]), 'Invalid object model: invalid relation source');
    invariant(EID.isEID(obj[RelationTargetDXNId]), 'Invalid object model: invalid relation target');
    invariant(!EID.isEID(obj[RelationSourceId]), 'Invalid object model: source pointer is a DXN');
    invariant(!EID.isEID(obj[RelationTargetId]), 'Invalid object model: target pointer is a DXN');
  }
}
