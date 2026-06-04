//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type EID } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import type { AnyEntity } from '../common/types';
import { type InternalObjectProps, ObjectDatabaseId } from './model';
import { getObjectEchoUri } from './util';

/**
 * Get the canonical EID of an entity.
 * Accepts both reactive entities and snapshots.
 */
export const getUri = (entity: AnyEntity): EID.EID => {
  const uri = getObjectEchoUri(entity);
  invariant(uri != null, 'Invalid entity.');
  return uri;
};

/**
 * Get the database the entity belongs to.
 * Accepts both reactive entities and snapshots.
 */
export const getDatabase = (entity: AnyEntity): any | undefined => {
  assumeType<InternalObjectProps>(entity);
  return entity[ObjectDatabaseId];
};
