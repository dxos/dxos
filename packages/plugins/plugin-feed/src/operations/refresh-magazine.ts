//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { type Database, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { type Magazine, Subscription } from '../types';
import { findStarTag } from '../util';
import { CurateMagazine, RefreshMagazine, SyncFeed } from './definitions';

export default RefreshMagazine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ magazine: magazineRef }) {
      const magazine = yield* Effect.promise(() => magazineRef.load());

      // Load each feed ref (and its backing ECHO feed) tolerating individual failures —
      // a single broken ref shouldn't block the rest of the refresh.
      const feeds = yield* Effect.promise(() =>
        Promise.all(
          magazine.feeds.map(async (ref) => {
            try {
              const feed = await ref.load();
              if (feed.feed) {
                await feed.feed.load();
              }
              return feed;
            } catch (err) {
              log.catch(err);
              return undefined;
            }
          }),
        ),
      );
      const validFeeds = feeds.filter((feed): feed is Subscription.Feed => Boolean(feed?.url));

      let synced = 0;
      for (const feed of validFeeds) {
        const result = yield* Effect.either(Operation.invoke(SyncFeed, { feed }));
        if (result._tag === 'Right') {
          synced += 1;
        } else {
          log.catch(result.left, { feedUrl: feed.url });
        }
      }

      const { added } = yield* Operation.invoke(CurateMagazine, { magazine: magazineRef });

      const db = Obj.getDatabase(magazine);
      applyPerFeedKeep(magazine, db);

      return { synced, added };
    }),
  ),
  Operation.opaqueHandler,
);

/** Bare-id tail of a DXN, robust to local (`@`) vs space-scoped DXN forms. */
const dxnTailId = (dxn: string): string => dxn.split(':').pop() ?? dxn;

/** Sortable timestamp from `post.published`; missing/unparseable falls last. */
const publishedTimestamp = (post: Subscription.Post): number => {
  if (!post.published) {
    return Number.NEGATIVE_INFINITY;
  }
  const ms = Date.parse(post.published);
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
};

/**
 * Apply each Subscription.Feed's `keep` bound to `magazine.posts`. Each
 * feed contributes up to its own `feed.keep ?? DEFAULT_KEEP` posts — NOT a
 * single magazine-wide cap. With a global cap, sorting all curated posts by
 * `published` and slicing top-N silently drops every post from the
 * older-dated feed; per-feed keep gives each feed a fair share. Starred
 * posts and unresolved refs are preserved unconditionally.
 *
 * Lands as a separate `Obj.change` write (not chained inside the
 * CurateMagazine operation) — chaining a second `mutable.posts = ...`
 * inside one change block trips ECHO's deep-mapper dedup invariant.
 */
const applyPerFeedKeep = (magazine: Magazine.Magazine, db: Database.Database | undefined): void => {
  const tag = db ? findStarTag(db) : undefined;
  const tagDxn = tag ? Obj.getDXN(tag).toString() : undefined;
  const isStarred = (post: Subscription.Post) => (tagDxn ? (Obj.getMeta(post).tags?.includes(tagDxn) ?? false) : false);

  const feedKeepById = new Map<string, number>();
  for (const feedRef of magazine.feeds) {
    const feed = feedRef.target;
    if (feed) {
      feedKeepById.set(dxnTailId(feedRef.dxn.toString()), feed.keep ?? Subscription.DEFAULT_KEEP);
    }
  }

  const resolvedPairs: Array<{ ref: Ref.Ref<Subscription.Post>; post: Subscription.Post }> = [];
  const unresolvedRefs: Ref.Ref<Subscription.Post>[] = [];
  for (const ref of magazine.posts) {
    const post = ref.target;
    if (post) {
      resolvedPairs.push({ ref, post });
    } else {
      unresolvedRefs.push(ref);
    }
  }

  const byFeedId = new Map<string | undefined, Array<{ ref: Ref.Ref<Subscription.Post>; post: Subscription.Post }>>();
  for (const pair of resolvedPairs) {
    const feedRefDxn = pair.post.feed?.dxn.toString();
    const feedId = feedRefDxn ? dxnTailId(feedRefDxn) : undefined;
    const arr = byFeedId.get(feedId) ?? [];
    arr.push(pair);
    byFeedId.set(feedId, arr);
  }

  const nextRefs: Ref.Ref<Subscription.Post>[] = [];
  for (const [feedId, pairs] of byFeedId) {
    if (feedId === undefined) {
      nextRefs.push(...pairs.map(({ ref }) => ref));
      continue;
    }
    const feedKeep = feedKeepById.get(feedId) ?? Subscription.DEFAULT_KEEP;
    const starredPairs = pairs.filter(({ post }) => isStarred(post));
    const candidatePairs = pairs
      .filter(({ post }) => !isStarred(post))
      .sort((pairA, pairB) => publishedTimestamp(pairB.post) - publishedTimestamp(pairA.post));
    const keptCandidates = candidatePairs.slice(0, Math.max(0, feedKeep));
    nextRefs.push(...starredPairs.map(({ ref }) => ref), ...keptCandidates.map(({ ref }) => ref));
  }
  nextRefs.push(...unresolvedRefs);

  if (nextRefs.length !== magazine.posts.length) {
    Obj.change(magazine, (magazine) => {
      magazine.posts = nextRefs;
    });
  }
};
