//
// Copyright 2025 DXOS.org
//

import { type ForeignKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, EID, type SpaceId, URI } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import { defineHiddenProperty } from '../common/proxy/define-hidden-property.ts';
import type { AnyEntity } from '../common/types/index.ts';
import { MetaId } from '../common/types/model-symbols.ts';
import { FeedBlockKeysId, type InternalObjectProps, ObjectBranchId, ObjectDatabaseId } from './model.ts';
import { getObjectEchoUri } from './util.ts';

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
export const getUri = (entity: AnyEntity, options?: GetURIOptions): URI.URI => {
  const prefer = options?.prefer;

  if (prefer === 'named') {
    const key = (entity as any)[MetaId]?.key;
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
 * The hidden feed block keys a client stamped on a live feed object it wrote; `undefined` when the
 * object's `@meta.keys` describe its latest block.
 */
export const getFeedBlockKeys = (entity: AnyEntity): readonly ForeignKey[] | undefined => {
  assumeType<InternalObjectProps>(entity);
  return entity[FeedBlockKeysId];
};

/**
 * Sets, or with `undefined` clears, the hidden feed block keys of a live feed object. Not reactive:
 * the keys describe the block the store wrote, not a change of the object.
 */
export const setFeedBlockKeys = (entity: AnyEntity, keys: readonly ForeignKey[] | undefined): void => {
  defineHiddenProperty(entity, FeedBlockKeysId, keys);
};

/**
 * Get the database the entity belongs to.
 * Accepts both reactive entities and snapshots.
 */
export const getDatabase = (entity: AnyEntity): any | undefined => {
  assumeType<InternalObjectProps>(entity);
  return entity[ObjectDatabaseId];
};

/**
 * Get the branch this entity instance is bound to (`'main'` for the canonical object, or the branch
 * of a `db.branch()` independent instance). Reads the branch off the instance, so two instances of the
 * same object id on different branches report their own branch.
 */
export const getBranch = (entity: AnyEntity): string => {
  assumeType<InternalObjectProps>(entity);
  return entity[ObjectBranchId] ?? 'main';
};
