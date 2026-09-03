//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, EID, Filter, Query } from '@dxos/echo';

import { Magazine, Subscription } from '#types';

import { publishedTimestamp } from '../util/date.ts';

/**
 * Resolves the Magazine's referenced feeds and the Posts in each feed's backing
 * ECHO queue, filtering out Posts already curated into `magazine.posts` (and cross-feed duplicates).
 */
export const collectCandidates = (magazine: Magazine.Magazine) =>
  Effect.gen(function* () {
    // Identity comes from the ref's own URI, never `ref.target`: curated Posts live in a feed queue,
    // whose refs stay unresolved in a freshly-spawned process even after `load()`. Comparing
    // `ref.target?.id` against a bare `post.id` silently matched nothing, so every already-curated
    // post was offered again and re-appended on each run.
    //
    // `EID.getEntityId` rather than `Ref.hasEntityId`: the latter additionally requires a *local*
    // (`echo:///<id>`) uri, and these refs are space-qualified — it returns false for every one of them.
    const curatedIds = new Set(
      magazine.posts.flatMap((ref) => {
        const uri = EID.tryParse(ref.uri);
        const entityId = uri && EID.getEntityId(uri);
        return entityId ? [entityId as string] : [];
      }),
    );
    const seen = new Set<string>();
    const candidates: Array<{ post: Subscription.Post; feed: Subscription.Subscription }> = [];
    for (const feedRef of magazine.feeds) {
      const feed = yield* Database.load(feedRef);
      const echoFeed = feed.feed?.target;
      if (!echoFeed) {
        continue;
      }
      const posts = yield* Database.query(Query.select(Filter.type(Subscription.Post)).from(echoFeed)).run;
      for (const post of posts) {
        if (seen.has(post.id) || curatedIds.has(post.id)) {
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
