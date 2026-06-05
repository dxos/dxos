//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';

import { type Database, Filter, Obj, Tag } from '@dxos/echo';
import { AtomObj, AtomQuery, AtomRef } from '@dxos/echo-atom';

import { Magazine, Subscription } from '../types';
import { publishedTimestamp } from '../util/sorting';

import { getImageUrl, getSnippet, pickLatestPostContent, queryPostContentForPost } from './post-content';
import { getReadAt, hasTag } from './post-state';

/**
 * Tile filter mode. Mutually exclusive — `default` shows everything except archived,
 * `starred` filters to starred posts, `archived` shows only archived posts.
 */
export type MagazineView = 'default' | 'starred' | 'archived';

/** Aggregate per-Post display data folded from the Post + its source Subscription's per-Post slice. */
export type MagazinePostData = {
  post: Obj.Snapshot<Subscription.Post>;
  feedName: string | undefined;
  read: boolean;
  starred: boolean;
  snippet: string;
  imageUrl: string | undefined;
};

/** Per-Post read slice. */
type ReadSlice = { readAt: string | undefined };

/** Per-Post tag slice (star/archive membership). */
type TagSlice = { starred: boolean; archived: boolean };

const EMPTY_READ_SLICE: ReadSlice = { readAt: undefined };
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
      starredUri: uriForTag(tags, Subscription.STARRED_TAG),
      archivedUri: uriForTag(tags, Subscription.ARCHIVED_TAG),
    })),
  ),
);

/**
 * This Post's `readAt`, sliced off its source Subscription's `postState`. Subscribes to the shared
 * Subscription but re-emits ONLY when this Post's `readAt` changes — sibling Posts' mutations are
 * recomputed and discarded without propagating.
 */
const postReadAtom = Atom.family((post: Subscription.Post) =>
  Atom.make<ReadSlice>((get) => {
    const ref = post.source;
    if (!ref) {
      return EMPTY_READ_SLICE;
    }
    // AtomRef resolves the live Subscription and fires only on load (not on mutation).
    const subscription = get(AtomRef.make(ref));
    if (!subscription) {
      return EMPTY_READ_SLICE;
    }
    let previous = getReadAt(subscription, post.id);
    const unsubscribe = Obj.subscribe(subscription, () => {
      const next = getReadAt(subscription, post.id);
      if (next !== previous) {
        previous = next;
        get.setSelf({ readAt: next });
      }
    });
    get.addFinalizer(() => unsubscribe());
    return { readAt: previous };
  }).pipe(Atom.keepAlive),
);

/**
 * This Post's `{ starred, archived }`, sliced off its source Subscription's `tags`. Re-emits ONLY
 * when this Post's tag membership flips.
 */
const postTagsAtom = Atom.family((post: Subscription.Post) =>
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
      starred: hasTag(subscription, post.id, starredUri),
      archived: hasTag(subscription, post.id, archivedUri),
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

/**
 * Whether a Post is visible under a given view. Depends ONLY on the Post's tag slice + view, so
 * read-state changes never wake it (and effect-atom dedupes the boolean, so e.g. starring a Post in
 * the `default` view does not propagate).
 */
const postVisibilityAtom = Atom.family((post: Subscription.Post) =>
  Atom.family((view: MagazineView) =>
    Atom.make<boolean>((get) => {
      const { starred, archived } = get(postTagsAtom(post));
      switch (view) {
        case 'archived':
          return archived;
        case 'starred':
          return !archived && starred;
        default:
          return !archived;
      }
    }),
  ),
);

/** Aggregate display data for one tile. Fires only on this Post's read/star/feed-name changes. */
const postDisplayAtom = Atom.family((post: Subscription.Post) =>
  Atom.make<MagazinePostData>((get) => {
    const snapshot = get(AtomObj.make(post));
    const ref = post.source;
    const subscription = ref ? get(AtomRef.make(ref)) : undefined;
    // `name`/`url` via property atoms — fire only on name/url change (e.g. after first sync).
    const feedName = subscription
      ? get(AtomObj.makeProperty(subscription, 'name')) || get(AtomObj.makeProperty(subscription, 'url'))
      : undefined;
    const { readAt } = get(postReadAtom(post));
    const { starred } = get(postTagsAtom(post));
    return {
      post: snapshot,
      feedName,
      read: readAt !== undefined,
      starred,
      snippet: getSnippet(snapshot),
      imageUrl: getImageUrl(snapshot),
    };
  }).pipe(Atom.keepAlive),
);

/**
 * Ordered Posts referenced by the Magazine, derived directly from the `magazine.posts` refs — no
 * query. Fires when the refs array changes (membership/order) or when a ref resolves. Resolving each
 * ref here, rather than a `reference('posts').from(Scope.space({ includeAllFeeds }))` query, avoids
 * the cross-feed fan-out that returned each curated Post once per feed scope (the 3× duplication).
 */
const magazinePostsAtom = Atom.family((magazine: Magazine.Magazine) =>
  Atom.make<Subscription.Post[]>((get) => {
    const refs = get(AtomObj.makeProperty(magazine, 'posts')) ?? [];
    const posts = refs
      .map((ref) => get(AtomRef.make(ref)))
      .filter((post): post is Subscription.Post => Boolean(post));
    return [...posts].sort((postA, postB) => publishedTimestamp(postB.published) - publishedTimestamp(postA.published));
  }),
);

/**
 * Ordered, view-filtered Posts for a Magazine. Re-runs on membership change OR a Post crossing the
 * view's filter boundary (star/archive); never on read-state changes. The list is not de-duplicated
 * here — sync keeps feed queues free of duplicates and LLM curation avoids adding duplicate posts.
 */
const visibleMagazinePostsAtom = Atom.family((magazine: Magazine.Magazine) =>
  Atom.family((view: MagazineView) =>
    Atom.make<Subscription.Post[]>((get) => {
      const posts = get(magazinePostsAtom(magazine));
      return posts.filter((post) => get(postVisibilityAtom(post)(view)));
    }),
  ),
);

/** This Post's fetched body (newest {@link Subscription.PostContent} entry), or undefined. */
const postContentAtom = Atom.family((post: Subscription.Post) =>
  Atom.make<Subscription.PostContent | undefined>((get) => {
    const ref = post.source;
    if (!ref) {
      return undefined;
    }
    const subscription = get(AtomRef.make(ref));
    if (!subscription) {
      return undefined;
    }
    const db = Obj.getDatabase(subscription);
    const query = queryPostContentForPost(subscription, post);
    if (!db || !query) {
      return undefined;
    }
    const entries = get(AtomQuery.make<Subscription.PostContent>(db, query));
    return pickLatestPostContent(entries);
  }).pipe(Atom.keepAlive),
);

//
// Hooks.
//

/** Ordered, view-filtered Posts for a Magazine. */
export const useVisibleMagazinePosts = (magazine: Magazine.Magazine, view: MagazineView): Subscription.Post[] =>
  useAtomValue(visibleMagazinePostsAtom(magazine)(view));

/** Aggregate per-Post display data for a tile. */
export const useMagazinePostData = (post: Subscription.Post): MagazinePostData => useAtomValue(postDisplayAtom(post));

/** This Post's read slice. */
export const useReadState = (post: Subscription.Post): ReadSlice => useAtomValue(postReadAtom(post));

/** This Post's tag slice (star/archive). */
export const useTagState = (post: Subscription.Post): TagSlice => useAtomValue(postTagsAtom(post));

/** This Post's fetched body, reactively. */
export const usePostContentAtom = (post: Subscription.Post): Subscription.PostContent | undefined =>
  useAtomValue(postContentAtom(post));
