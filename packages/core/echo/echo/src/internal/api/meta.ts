//
// Copyright 2025 DXOS.org
//

import type { ForeignKey } from '@dxos/echo-protocol';
import { assertArgument, invariant } from '@dxos/invariant';
import type { DeepReadonly } from '@dxos/util';

import { type Mutable } from '../proxy';
import { type AnyProperties, type ObjectMeta, getMeta as getMeta$ } from '../types';

/**
 * Deeply read-only version of ObjectMeta.
 */
export type ReadonlyMeta = DeepReadonly<ObjectMeta>;

/**
 * Mutable meta type received in meta mutation callbacks.
 */
export type Meta = Mutable<ObjectMeta>;

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
 * Must be called within an Obj.change or Relation.change callback.
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
 * Add a tag to the entity.
 * Must be called within an Obj.change or Relation.change callback.
 */
export const addTag = (entity: Mutable<AnyProperties>, tag: string) => {
  const meta = getMetaChecked(entity);
  meta.tags ??= [];
  meta.tags.push(tag);
};

/**
 * Remove a tag from the entity.
 * Must be called within an Obj.change or Relation.change callback.
 */
export const removeTag = (entity: Mutable<AnyProperties>, tag: string) => {
  const meta = getMetaChecked(entity);
  if (!meta.tags) {
    return;
  }
  for (let i = 0; i < meta.tags.length; i++) {
    if (meta.tags[i] === tag) {
      meta.tags.splice(i, 1);
      i--;
    }
  }
};
