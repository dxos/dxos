//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Operation } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { FeedOperation, type Magazine, Subscription } from '../types';
import { findSystemTagUri, hasTag } from '../state';
import { dxnTailId } from '../util/dxn';
import { publishedTimestamp } from '../util/sorting';

export default FeedOperation.CurateMagazine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ magazine: magazineRef }) {
      const magazine = yield* Effect.promise(() => magazineRef.load());

      // Load each feed ref (and its backing ECHO feed) tolerating individual failures.
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
      const validFeeds = feeds.filter((feed): feed is Subscription.Subscription => Boolean(feed?.url));

      let synced = 0;
      for (const feed of validFeeds) {
        const result = yield* Effect.either(
          Operation.invoke(
            FeedOperation.SyncFeed,
            { feed: Ref.make(feed) },
            { spaceId: Obj.getDatabase(feed)?.spaceId },
          ),
        );
        if (result._tag === 'Right') {
          synced += 1;
        } else {
          log.catch(result.left, { feedUrl: feed.url });
        }
      }

      // Run the magazine's routine through the AI blueprint to select and enrich posts. The blueprint
      // is responsible for not adding duplicate (incl. fuzzy) posts — there is no magazine-level dedup.
      const spaceId = Obj.getDatabase(magazine)?.spaceId;
      if (magazine.routine && spaceId) {
        yield* Operation.invoke(AgentPrompt, { prompt: magazine.routine, input: {} }, { spaceId }).pipe(Effect.ignore);
      }

      // Per-feed keep bounds how many posts each feed contributes.
      const db = Obj.getDatabase(magazine);
      const starredUri = db ? yield* Effect.promise(() => findSystemTagUri(db, 'starred')) : undefined;
      applyPerFeedKeep(magazine, starredUri);

      return { synced };
    }),
  ),
  Operation.opaqueHandler,
);

/**
 * Apply each Subscription.Subscription's `keep` bound to `magazine.posts`. Each
 * feed contributes up to its own `feed.keep ?? DEFAULT_KEEP` posts. Starred
 * posts and unresolved refs are preserved unconditionally.
 */
export const applyPerFeedKeep = (magazine: Magazine.Magazine, starredUri: string | undefined): void => {
  const isStarred = (post: Subscription.Post) =>
    hasTag(post.source?.target, post.id, starredUri);

  const feedKeepById = new Map<string, number>();
  for (const feedRef of magazine.feeds) {
    const feed = feedRef.target;
    if (feed) {
      feedKeepById.set(dxnTailId(feedRef.uri), feed.keep ?? Subscription.DEFAULT_KEEP);
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
    const feedRefURI = pair.post.source?.uri;
    const feedId = feedRefURI ? dxnTailId(feedRefURI) : undefined;
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
      .sort((pairA, pairB) => publishedTimestamp(pairB.post.published) - publishedTimestamp(pairA.post.published));
    const keptCandidates = candidatePairs.slice(0, Math.max(0, feedKeep));
    nextRefs.push(...starredPairs.map(({ ref }) => ref), ...keptCandidates.map(({ ref }) => ref));
  }
  nextRefs.push(...unresolvedRefs);

  if (nextRefs.length !== magazine.posts.length) {
    Obj.update(magazine, (magazine) => {
      magazine.posts = nextRefs;
    });
  }
};
