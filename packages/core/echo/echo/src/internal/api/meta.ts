//
// Copyright 2025 DXOS.org
//

/**
 * Common meta helpers shared by Obj and Relation modules.
 *
 * NOTE: getMeta is renamed to getMetaChecked to avoid conflict with types/meta.ts.
 */

import type { ForeignKey } from '@dxos/echo-protocol';
import { assertArgument, invariant } from '@dxos/invariant';
import type { DeepReadonly } from '@dxos/util';

import { change as change$ } from '../proxy';
import { type AnyProperties, type ObjectMeta, getMeta as getMeta$ } from '../types';

/**
 * Deeply read-only version of ObjectMeta.
 */
export type ReadonlyMeta = DeepReadonly<ObjectMeta>;

/**
 * Mutable meta type received in the `changeMeta()` callback.
 */
export type Meta = ObjectMeta;

/**
 * Get the metadata for an entity with validation.
 * Returns a read-only view of the metadata.
 * Accepts both reactive entities and snapshots.
 */
export const getMetaChecked = (entity: AnyProperties): ReadonlyMeta => {
  assertArgument(entity, 'entity', 'Should be an entity.');
  const meta = getMeta$(entity);
  invariant(meta != null, 'Invalid entity.');
  return meta;
};

/**
 * Perform mutations on an entity's metadata within a controlled context.
 * Only accepts reactive entities (not snapshots).
 */
export const changeMeta = (entity: AnyProperties, callback: (meta: ObjectMeta) => void): void => {
  assertArgument(entity, 'entity', 'Should be an entity.');
  const meta = getMeta$(entity);
  invariant(meta != null, 'Invalid entity.');
  change$(entity, () => {
    callback(meta);
  });
};

/**
 * @returns Foreign keys for the entity from the specified source.
 * Accepts both reactive entities and snapshots.
 */
export const getKeys = (entity: AnyProperties, source: string): ForeignKey[] => {
  assertArgument(entity, 'entity', 'Should be an entity.');
  const meta = getMetaChecked(entity);
  invariant(meta != null, 'Invalid entity.');
  return meta.keys.filter((key) => key.source === source);
};

/**
 * Delete all keys from the entity for the specified source.
 * Only accepts reactive entities (not snapshots).
 */
export const deleteKeys = (entity: AnyProperties, source: string) => {
  changeMeta(entity, (meta) => {
    for (let i = 0; i < meta.keys.length; i++) {
      if (meta.keys[i].source === source) {
        meta.keys.splice(i, 1);
        i--;
      }
    }
  });
};

/**
 * Add a tag to the entity.
 * Only accepts reactive entities (not snapshots).
 */
export const addTag = (entity: AnyProperties, tag: string) => {
  changeMeta(entity, (meta) => {
    meta.tags ??= [];
    meta.tags.push(tag);
  });
};

/**
 * Remove a tag from the entity.
 * Only accepts reactive entities (not snapshots).
 */
export const removeTag = (entity: AnyProperties, tag: string) => {
  changeMeta(entity, (meta) => {
    if (!meta.tags) {
      return;
    }
    for (let i = 0; i < meta.tags.length; i++) {
      if (meta.tags[i] === tag) {
        meta.tags.splice(i, 1);
        i--;
      }
    }
  });
};
