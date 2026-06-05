//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';

import { type Database, Filter, Obj, Tag } from '@dxos/echo';
import { AtomQuery, AtomRef } from '@dxos/echo-atom';

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
  AtomQuery.make(db, Filter.type(Tag.Tag)).pipe(
    Atom.map((tags) => ({
      starredUri: uriForTag(tags, Subscription.SYSTEM_TAGS.starred.key),
      archivedUri: uriForTag(tags, Subscription.SYSTEM_TAGS.archived.key),
    })),
  ),
);

/**
 * This Post's `{ starred, archived }`, sliced off its source Subscription's `tags`. Re-emits ONLY
 * when this Post's tag membership flips.
 */
export const postTagsAtom = Atom.family((post: Subscription.Post) =>
  Atom.make<TagSlice>((get) => {
    const ref = post.source;
    if (!ref) {
      return EMPTY_TAG_SLICE;
    }
    const subscription = get(AtomRef.make(ref));
    if (!subscription) {
      return EMPTY_TAG_SLICE;
    }
    const db = Obj.getDatabase(subscription);
    const { starredUri, archivedUri } = db ? get(tagUrisAtom(db)) : EMPTY_TAG_URIS;
    const compute = (): TagSlice => ({
      starred: Subscription.hasTag(subscription, post.id, starredUri),
      archived: Subscription.hasTag(subscription, post.id, archivedUri),
    });
    let previous = compute();
    const unsubscribe = Obj.subscribe(subscription, () => {
      const next = compute();
      if (next.starred !== previous.starred || next.archived !== previous.archived) {
        previous = next;
        get.setSelf(next);
      }
    });
    get.addFinalizer(() => unsubscribe());
    return previous;
  }).pipe(Atom.keepAlive),
);

/** This Post's tag slice (star/archive). */
export const useTagState = (post: Subscription.Post): TagSlice => useAtomValue(postTagsAtom(post));
