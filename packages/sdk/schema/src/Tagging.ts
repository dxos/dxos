//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Database, Obj, type Ref, Tag } from '@dxos/echo';
import { EID, URI } from '@dxos/keys';

import * as TagIndex from './TagIndex.ts';

/**
 * Unified tag handling for objects whether their tags live on the object (mutable database objects)
 * or alongside it (immutable feed/queue objects).
 *
 * - Mutable database objects track their tags in `Obj.getMeta(obj).tags` (an array of {@link Tag} objects).
 * - Immutable feed objects can't carry their own meta, so their tags live in a {@link TagIndex}
 *   object referenced from a host; pass that index via {@link Options.index}.
 *
 * Either way the tag id is an existing {@link Tag} object's id/URI, so the same tag applies across
 * mutable and immutable objects and its label is resolved (and edited) in one place. This API works
 * in terms of those URI tag ids; on the mutable path it converts to/from the {@link Tag} objects in meta.
 */
export interface Options {
  /** Tag index holding tags for the (immutable) object. Omit for mutable objects. */
  index?: TagIndex.TagIndex;
}

/** Returns the tag ids (URIs) applied to an object. */
export const get = (object: Obj.Any | Obj.Snapshot<Obj.Any>, { index }: Options = {}): string[] => {
  if (index) {
    return TagIndex.bind(index).tags(object.id);
  }

  return Obj.getMeta(object).tags.map((tag) => Obj.getURI(tag));
};

/** The entity id a tag id (URI) names, so local and space-qualified forms compare alike. */
const tagEntityId = (tagId: string): string => {
  const eid = EID.tryParse(tagId);
  return (eid && EID.getEntityId(eid)) || tagId;
};

/** The {@link Tag} object a tag id names, from the database the object lives in. */
const lookupTag = (object: Obj.Any, tagId: string): Tag.Tag => {
  const tag = Obj.getDatabase(object)?.getObjectById(tagEntityId(tagId));
  if (!Obj.instanceOf(Tag.Tag, tag)) {
    throw new TypeError(`tag not found in the object's database: ${tagId}`);
  }
  return tag;
};

/** Applies a tag (by id/URI) to an object (idempotent). */
export const set = (object: Obj.Any | Obj.Snapshot<Obj.Any>, tagId: string, { index }: Options = {}): void => {
  if (index) {
    // Index path is keyed by id, so it works for immutable snapshots (e.g. feed messages) too.
    TagIndex.bind(index).setTag(tagId, object.id);
    return;
  }
  // The on-object meta path mutates the object, so it requires a live (non-snapshot) object.
  if (Obj.isSnapshot(object)) {
    throw new TypeError('tagging without an index requires a live object');
  }
  const tag = lookupTag(object, tagId);
  Obj.update(object, (object) => Obj.addTag(object, tag));
};

/**
 * Applies many (object, tagId) pairs at once. On the index path this is a single `Obj.update` (one
 * Automerge change + one reactive notification for the whole batch, vs one per {@link set}) — use it
 * for bulk tagging (e.g. a sync page) to avoid a per-tag change/notification storm. Falls back to
 * per-pair {@link set} on the mutable path (no index), where each object's meta changes separately.
 */
export const setBatch = (entries: readonly { object: Obj.Any; tagId: string }[], { index }: Options = {}): void => {
  if (!index) {
    for (const { object, tagId } of entries) {
      set(object, tagId, {});
    }
    return;
  }
  TagIndex.bind(index).setBatch(entries.map(({ object, tagId }) => ({ tagId, objectId: object.id })));
};

/** Removes a tag (by id/URI) from an object. No-op when not present. */
export const unset = (object: Obj.Any | Obj.Snapshot<Obj.Any>, tagId: string, { index }: Options = {}): void => {
  if (index) {
    // Index path is keyed by id, so it works for immutable snapshots (e.g. feed messages) too.
    TagIndex.bind(index).unsetTag(tagId, object.id);
    return;
  }
  // The on-object meta path mutates the object, so it requires a live (non-snapshot) object.
  if (Obj.isSnapshot(object)) {
    throw new TypeError('tagging without an index requires a live object');
  }
  const id = tagEntityId(tagId);
  Obj.update(object, (object) => {
    const meta = Obj.getMeta(object);
    for (let i = meta.tags.length - 1; i >= 0; i--) {
      if (meta.tags[i].id === id) {
        meta.tags.splice(i, 1);
      }
    }
  });
};

/** Resolves tag ids (URIs) to {@link Tag} object refs via the database. */
export const resolve = (db: Pick<Database.Database, 'makeRef'>, tagIds: readonly string[]): Ref.Ref<Tag.Tag>[] =>
  tagIds.map((id) => db.makeRef<Tag.Tag>(URI.make(id)));
