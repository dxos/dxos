//
// Copyright 2025 DXOS.org
//

/**
 * Common entity helpers shared by Obj and Relation modules.
 * These operate on Entity.Base (accepting both reactive and snapshots).
 *
 * NOTE: getTypeDXN, getSchema, getTypename, isDeleted are NOT exported here
 * to avoid conflicts with existing internal exports. Use the versions from
 * internal/annotations, internal/types, and internal/object respectively.
 */

import { invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import { type InternalObjectProps, ObjectDatabaseId, getObjectDXN } from '../entities';
import type { AnyEntity } from '../types';

/**
 * Get the DXN of an entity.
 * Accepts both reactive entities and snapshots.
 */
export const getDXN = (entity: AnyEntity): DXN => {
  const dxn = getObjectDXN(entity);
  invariant(dxn != null, 'Invalid entity.');
  return dxn;
};

/**
 * Get the database the entity belongs to.
 * Accepts both reactive entities and snapshots.
 */
export const getDatabase = (entity: AnyEntity): any | undefined => {
  assumeType<InternalObjectProps>(entity);
  return entity[ObjectDatabaseId];
};
