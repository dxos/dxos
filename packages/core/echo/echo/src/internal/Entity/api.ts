//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { DXN, EID, URI, type SpaceId } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import type { AnyEntity } from '../common/types';
import { getMeta } from '../common/types/meta';
import { type InternalObjectProps, ObjectDatabaseId } from './model';
import { getObjectEchoUri } from './util';

/**
 * Controls the URI form returned by `getUri` and the public `*.getURI` helpers.
 *
 * - `'named'`    — Registry key URI (`dxn:<meta.key>`) when the entity has a key in its meta;
 *                  falls back to the default EID.
 * - `'absolute'` — Fully-qualified EID with space id (`echo://<spaceId>/<entityId>`);
 *                  falls back when no space is available.
 * - `'relative'` — Local EID without space id (`echo:/<entityId>`).
 *
 * Omitting `prefer` preserves the existing behaviour.
 */
export type GetURIOptions = {
  prefer?: 'named' | 'absolute' | 'relative';
};

/**
 * Get the URI of an entity.
 * Accepts both reactive entities and snapshots.
 */
export const getUri = (entity: AnyEntity, options?: GetURIOptions): EID.EID | URI.URI => {
  const prefer = options?.prefer;

  if (prefer === 'named') {
    const key = getMeta(entity as any)?.key;
    if (key) {
      return (DXN.tryMake(`dxn:${key}`) ?? URI.make(key)) as URI.URI;
    }
    const uri = getObjectEchoUri(entity);
    invariant(uri != null, 'Invalid entity.');
    return uri;
  }

  if (prefer === 'relative') {
    const eid = getObjectEchoUri(entity);
    invariant(eid != null, 'Invalid entity.');
    const entityId = EID.getEntityId(eid);
    return entityId ? EID.make({ entityId }) : eid;
  }

  if (prefer === 'absolute') {
    const eid = getObjectEchoUri(entity);
    invariant(eid != null, 'Invalid entity.');
    const entityId = EID.getEntityId(eid);
    if (!entityId) {
      return eid;
    }
    assumeType<InternalObjectProps>(entity);
    const spaceId: SpaceId | undefined = entity[ObjectDatabaseId]?.spaceId ?? EID.getSpaceId(eid);
    return spaceId ? EID.make({ spaceId, entityId }) : eid;
  }

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
