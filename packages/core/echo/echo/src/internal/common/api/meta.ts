//
// Copyright 2025 DXOS.org
//

import type { ForeignKey } from '@dxos/echo-protocol';
import { assertArgument, invariant } from '@dxos/invariant';
import type { DeepReadonly } from '@dxos/util';

import type * as Tag from '../../../Tag';
import type { Ref } from '../../Ref/ref';
import { type Mutable } from '../proxy';
import { type AnyProperties } from '../types';
import { type EntityMeta, getMeta as getMeta$ } from '../types/meta';

/**
 * Deeply read-only version of EntityMeta.
 */
export type ReadonlyMeta = DeepReadonly<EntityMeta>;

/**
 * Mutable meta type received in meta mutation callbacks.
 */
export type Meta = Mutable<EntityMeta>;

/**
 * Get the metadata for an entity with validation.
 * Returns mutable meta when passed a mutable entity (inside change callback).
 * Returns read-only meta when passed a regular entity or snapshot.
 *
 * TODO(burdon): When passed a Snapshot, should return a snapshot of meta, not the live meta proxy.
 */
export function getMetaChecked(entity: Mutable<AnyProperties>): Meta;
export function getMetaChecked(entity: AnyProperties): ReadonlyMeta;
export function getMetaChecked(entity: AnyProperties): Meta | ReadonlyMeta {
  assertArgument(entity, 'entity', 'Should be an entity.');
  const meta = getMeta$(entity);
  invariant(meta != null, 'Invalid entity.');
  return meta;
}

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
 * Must be called within an Obj.update or Relation.update callback.
 */
export const deleteKeys = (entity: Mutable<AnyProperties>, source: string) => {
  const meta = getMetaChecked(entity);
  for (let i = 0; i < meta.keys.length; i++) {
    if (meta.keys[i].source === source) {
      meta.keys.splice(i, 1);
      i--;
    }
  }
};

/**
 * Add a tag (a reference to a {@link Tag} object) to the entity. Idempotent.
 * Must be called within an Obj.update or Relation.update callback.
 */
export const addTag = (entity: Mutable<AnyProperties>, tag: Ref<Tag.Tag>) => {
  const meta = getMetaChecked(entity);
  // Two refs to the same target are not `===`; dedupe by URI.
  if (!meta.tags.some((existing) => existing.uri === tag.uri)) {
    meta.tags.push(tag);
  }
};

/**
 * Remove a tag (a reference to a {@link Tag} object) from the entity. No-op when not present.
 * Must be called within an Obj.update or Relation.update callback.
 */
export const removeTag = (entity: Mutable<AnyProperties>, tag: Ref<Tag.Tag>) => {
  const meta = getMetaChecked(entity);
  for (let i = 0; i < meta.tags.length; i++) {
    if (meta.tags[i].uri === tag.uri) {
      meta.tags.splice(i, 1);
      i--;
    }
  }
};
