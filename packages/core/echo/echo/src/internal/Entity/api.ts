//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type EchoId } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import type { AnyEntity } from '../common/types';
import { type InternalObjectProps, ObjectDatabaseId } from './model';
import { getObjectEchoId } from './util';

/**
 * Get the EchoId of an entity.
 * Accepts both reactive entities and snapshots.
 */
export const getEchoId = (entity: AnyEntity): EchoId.EchoId => {
  const echoId = getObjectEchoId(entity);
  invariant(echoId != null, 'Invalid entity.');
  return echoId;
};

/**
 * Get the database the entity belongs to.
 * Accepts both reactive entities and snapshots.
 */
export const getDatabase = (entity: AnyEntity): any | undefined => {
  assumeType<InternalObjectProps>(entity);
  return entity[ObjectDatabaseId];
};
