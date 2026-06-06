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
 * - Immutable feed objects can't carry their own meta, so their tags live in a {@link TagIndex} on
 *   a host object; pass that host via {@link Options.host}.
 *
 * Either way the tag id is an existing {@link Tag} object's id/URI, so the same tag applies across
 * mutable and immutable objects and its label is resolved (and edited) in one place. This API works
 * in terms of those URI tag ids; on the mutable path it converts to/from the stored `Ref<Tag>`.
 */
export interface Options {
  /** Host object whose tag index holds tags for the (immutable) object. Omit for mutable objects. */
  host?: Obj.Any;
  /** Tag-index field name on the host (default `tags`). */
  key?: string;
}

const DEFAULT_KEY = 'tags';

/** Returns the tag ids (URIs) applied to an object. */
export const get = (object: Obj.Any | Obj.Snapshot<Obj.Any>, options: Options = {}): string[] => {
  const { host, key = DEFAULT_KEY } = options;
  if (host) {
    return TagIndex.bind(host, key).tags(object.id);
  }
  return Obj.getMeta(object).tags.map((tag) => tag.uri);
};

/** Applies a tag (by id/URI) to an object (idempotent). */
export const set = (object: Obj.Any, tagId: string, options: Options = {}): void => {
  const { host, key = DEFAULT_KEY } = options;
  if (host) {
    TagIndex.bind(host, key).setTag(tagId, object.id);
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

/** Removes a tag (by id/URI) from an object. No-op when not present. */
export const unset = (object: Obj.Any, tagId: string, options: Options = {}): void => {
  const { host, key = DEFAULT_KEY } = options;
  if (host) {
    TagIndex.bind(host, key).unsetTag(tagId, object.id);
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
