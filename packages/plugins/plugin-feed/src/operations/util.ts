//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Query } from '@dxos/echo';

import { type Magazine, type Subscription } from '../types';

/**
 * Resolves the Magazine's referenced feeds and the Posts in each feed's backing
 * ECHO queue, filtering out Posts whose refs already appear in `magazine.posts`.
 */
export const collectCandidates = (magazine: Magazine.Magazine) =>
  Effect.gen(function* () {
    const curatedIds = new Set(magazine.posts.map((ref) => ref.dxn.toString()));
    const candidates: Array<{ post: Subscription.Post; feed: Subscription.Feed }> = [];
    for (const feedRef of magazine.feeds) {
      const feed = yield* Database.load(feedRef);
      const echoFeed = feed.feed?.target;
      if (!echoFeed) {
        continue;
      }
      const posts = yield* Database.runQuery<Subscription.Post>(
        Query.select(Filter.everything()).from(echoFeed),
      );
      for (const post of posts) {
        const postDxn = Obj.getDXN(post).toString();
        if (curatedIds.has(postDxn)) {
          continue;
        }
        candidates.push({ post, feed });
      }
    }
    return candidates;
  });
