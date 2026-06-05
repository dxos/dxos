//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Query } from '@dxos/echo';

import { type Magazine, Subscription } from '../types';
import { publishedTimestamp } from '../util/date';

/**
 * Resolves the Magazine's referenced feeds and the Posts in each feed's backing
 * ECHO queue, filtering out Posts already curated into `magazine.posts` (and cross-feed duplicates).
 */
export const collectCandidates = (magazine: Magazine.Magazine) =>
  Effect.gen(function* () {
    const seen = new Set(magazine.posts.map((ref) => ref.target?.id ?? ref.uri));
    const candidates: Array<{ post: Subscription.Post; feed: Subscription.Subscription }> = [];
    for (const feedRef of magazine.feeds) {
      const feed = yield* Database.load(feedRef);
      const echoFeed = feed.feed?.target;
      if (!echoFeed) {
        continue;
      }
      const posts = yield* Database.runQuery(Query.select(Filter.type(Subscription.Post)).from(echoFeed));
      for (const post of posts) {
        if (seen.has(post.id)) {
          continue;
        }
        seen.add(post.id);
        candidates.push({ post, feed });
      }
    }
    return candidates;
  });

/**
 * Partitions posts into those to keep and those to drop, given a maximum
 * non-starred retention bound. Starred posts are always kept; the remaining
 * non-starred posts are sorted newest-first by `published` and the top
 * `keep` retained.
 *
 * `isStarred` is injectable; callers with a starred-tag uri pass a predicate backed by it
 * (defaults to treating nothing as starred).
 */
export const partitionByKeepBound = <T extends Subscription.Post>(
  posts: readonly T[],
  keep: number,
  isStarred: (post: T) => boolean = () => false,
): { kept: T[]; dropped: T[] } => {
  const kept: T[] = [];
  const candidates: T[] = [];
  for (const post of posts) {
    if (isStarred(post)) {
      kept.push(post);
    } else {
      candidates.push(post);
    }
  }
  candidates.sort((a, b) => publishedTimestamp(b.published) - publishedTimestamp(a.published));
  const retained = candidates.slice(0, Math.max(0, keep));
  const dropped = candidates.slice(Math.max(0, keep));
  return { kept: [...kept, ...retained], dropped };
};
