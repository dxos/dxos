//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Database, Obj, Ref, type Tag } from '@dxos/echo';
import { EID, URI } from '@dxos/keys';

import * as TagIndex from './TagIndex';

/**
 * Unified tag handling for objects whether their tags live on the object (mutable database objects)
 * or alongside it (immutable feed/queue objects).
 *
 * - Mutable database objects track their tags in `Obj.getMeta(obj).tags` (an array of `Ref<Tag>`).
 * - Immutable feed objects can't carry their own meta, so their tags live in a {@link TagIndex}
 *   object referenced from a host; pass that index via {@link Options.index}.
 *
 * Either way the tag id is an existing {@link Tag} object's id/URI, so the same tag applies across
 * mutable and immutable objects and its label is resolved (and edited) in one place. This API works
 * in terms of those URI tag ids; on the mutable path it converts to/from the stored `Ref<Tag>`.
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

  return Obj.getMeta(object).tags.map((tag) => tag.uri);
};

/** Applies a tag (by id/URI) to an object (idempotent). */
export const set = (object: Obj.Any, tagId: string, { index }: Options = {}): void => {
  if (index) {
    TagIndex.bind(index).setTag(tagId, object.id);
    return;
  }
  // Stored tag refs are canonical EIDs (read-time upgrade normalizes legacy DXN ids); normalize the
  // incoming id the same way so dedupe compares like-for-like.
  const id = EID.tryParse(tagId) ?? tagId;
  Obj.update(object, (object) => {
    const meta = Obj.getMeta(object);
    if (!meta.tags.some((tag) => tag.uri === id)) {
      meta.tags.push(Ref.fromURI(URI.make(id)));
    }
  });
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
export const unset = (object: Obj.Any, tagId: string, { index }: Options = {}): void => {
  if (index) {
    TagIndex.bind(index).unsetTag(tagId, object.id);
    return;
  }
  const id = EID.tryParse(tagId) ?? tagId;
  Obj.update(object, (object) => {
    const meta = Obj.getMeta(object);
    for (let i = meta.tags.length - 1; i >= 0; i--) {
      if (meta.tags[i].uri === id) {
        meta.tags.splice(i, 1);
      }
    }
  });
};

/** Resolves tag ids (URIs) to {@link Tag} object refs via the database. */
export const resolve = (db: Pick<Database.Database, 'makeRef'>, tagIds: readonly string[]): Ref.Ref<Tag.Tag>[] =>
  tagIds.map((id) => db.makeRef<Tag.Tag>(URI.make(id)));
