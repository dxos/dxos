//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';

import { type Database, Filter, Obj, QueryResult, Tag } from '@dxos/echo';
import { TagIndex } from '@dxos/schema';

import { Subscription } from '../types';

/** Per-Post tag slice (star/archive membership). */
export type TagSlice = { starred: boolean; archived: boolean };

const EMPTY_TAG_SLICE: TagSlice = { starred: false, archived: false };
const EMPTY_TAG_URIS = { starredUri: undefined, archivedUri: undefined } as const;

/** Resolve the uri of a system Tag by foreign key (mirrors `useSystemTags`). */
const uriForTag = (tags: readonly Tag.Tag[], key: { source: string; id: string }): string | undefined => {
  const match = tags.find((tag) => Obj.getKeys(tag, key.source).some((foreignKey) => foreignKey.id === key.id));
  return match ? Obj.getURI(match).toString() : undefined;
};

/**
 * Resolved uris of the `starred` / `archived` system Tags, keyed by database. Fires only when the
 * Tag set changes (rare — on first star/archive). Shared by every per-Post tag slice.
 */
const tagUrisAtom = Atom.family((db: Database.Database) =>
  QueryResult.atom(db, Filter.type(Tag.Tag)).pipe(
    Atom.map((tags) => ({
      starredUri: uriForTag(tags, Subscription.SYSTEM_TAGS.starred.key),
      archivedUri: uriForTag(tags, Subscription.SYSTEM_TAGS.archived.key),
    })),
  ),
);

/**
 * This Post's `{ starred, archived }`, sliced off its source Subscription's `tags`. Fires only
 * when this Post's tag membership flips — sibling Posts' tag mutations are discarded without
 * propagating. Re-initialises its tag subscription when tag uris change (first star ever in the space).
 */
export const postTagsAtom = Atom.family((post: Subscription.Post) =>
  Atom.make<TagSlice>((get) => {
    const ref = post.source;
    if (!ref) {
      return EMPTY_TAG_SLICE;
    }
    const subscription = get(ref.atom);
    if (!subscription) {
      return EMPTY_TAG_SLICE;
    }
    const tagIndex = get(subscription.tags.atom);
    if (!tagIndex) {
      return EMPTY_TAG_SLICE;
    }
    const db = Obj.getDatabase(subscription);
    const { starredUri, archivedUri } = db ? get(tagUrisAtom(db)) : EMPTY_TAG_URIS;
    return {
      starred: get(TagIndex.atom(tagIndex, post.id, starredUri)),
      archived: get(TagIndex.atom(tagIndex, post.id, archivedUri)),
    };
  }).pipe(Atom.keepAlive),
);

/** This Post's tag slice (star/archive). */
export const useTagState = (post: Subscription.Post): TagSlice => useAtomValue(postTagsAtom(post));
