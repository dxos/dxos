//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Query, type Tag } from '@dxos/echo';

import { type Magazine, Subscription } from '../types';
import { hasMetaTag } from '../util';

/**
 * Resolves the Magazine's referenced feeds and the Posts in each feed's backing
 * ECHO queue, filtering out Posts whose refs already appear in `magazine.posts`.
 */
export const collectCandidates = (magazine: Magazine.Magazine) =>
  Effect.gen(function* () {
    const seenPostIds = new Set(magazine.posts.map((ref) => ref.dxn.toString()));
    const candidates: Array<{ post: Subscription.Post; feed: Subscription.Feed }> = [];
    for (const feedRef of magazine.feeds) {
      const feed = yield* Database.load(feedRef);
      const echoFeed = feed.feed?.target;
      if (!echoFeed) {
        continue;
      }
      const posts = yield* Database.runQuery(Query.select(Filter.type(Subscription.Post)).from(echoFeed));
      for (const post of posts) {
        const postDxn = Obj.getDXN(post).toString();
        if (seenPostIds.has(postDxn)) {
          continue;
        }
        seenPostIds.add(postDxn);
        candidates.push({ post, feed });
      }
    }
    return candidates;
  });

/** Parses a Post's `published` field to a sort key (newest first); missing/unparseable falls to the bottom. */
export const publishedTimestamp = (post: Subscription.Post): number => {
  if (!post.published) {
    return Number.NEGATIVE_INFINITY;
  }
  const ms = Date.parse(post.published);
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
};

/**
 * Partitions posts into those to keep and those to drop, given a maximum
 * non-starred retention bound. Starred posts are always kept; the remaining
 * non-starred posts are sorted newest-first by `published` and the top
 * `keep` retained.
 */
export const partitionByKeepBound = <T extends Subscription.Post>(
  posts: readonly T[],
  keep: number,
  starTag: Tag.Tag | undefined,
): { kept: T[]; dropped: T[] } => {
  const kept: T[] = [];
  const candidates: T[] = [];
  for (const post of posts) {
    if (starTag && hasMetaTag(post, starTag)) {
      kept.push(post);
    } else {
      candidates.push(post);
    }
  }
  candidates.sort((a, b) => publishedTimestamp(b) - publishedTimestamp(a));
  const retained = candidates.slice(0, Math.max(0, keep));
  const dropped = candidates.slice(Math.max(0, keep));
  return { kept: [...kept, ...retained], dropped };
};
