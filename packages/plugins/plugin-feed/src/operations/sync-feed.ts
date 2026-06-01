//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';


import { FeedOperation, Subscription } from '../types';
import { type FeedFetcher, fetchAtproto, fetchRss } from '../util';

/** Resolves the appropriate fetcher for the given feed type. */
const getFetcher = (type: Subscription.FeedType | undefined): FeedFetcher => {
  switch (type) {
    case 'atproto':
      return fetchAtproto;
    case 'rss':
    default:
      return fetchRss;
  }
};

const handler: Operation.WithHandler<typeof FeedOperation.SyncFeed> = FeedOperation.SyncFeed.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ feed }) {
      const subscriptionFeed = yield* Database.load(feed);
      const url = subscriptionFeed.url;
      invariant(url, 'Feed URL is required.');
      const echoFeed = yield* Database.load(subscriptionFeed.feed);
      invariant(echoFeed, 'Backing ECHO feed not found.');
      invariant(Feed.getQueueUri(echoFeed), 'Feed not stored in a space.');

      const corsProxy = typeof window !== 'undefined' ? '/api/rss?url=' : undefined;
      const fetcher = getFetcher(subscriptionFeed.type);
      const { feed: feedMeta, posts } = yield* Effect.tryPromise(async () => fetcher(url, { corsProxy }));
      const cursor = subscriptionFeed.cursor;

      // Filter posts newer than the cursor.
      const newPosts = cursor ? posts.filter((post) => post.guid !== cursor) : posts;

      // Append new posts to the ECHO feed.
      // NOTE: The `Subscription.Subscription.keep` bound is currently NOT enforced
      // here via `Feed.remove()`. Doing so wipes the underlying queue's
      // `_objectCache` for the deleted posts, but those same Post objects
      // persist in `space.db` (they were added there when first curated
      // into a Magazine via `createRef` → `database.add`). On the next
      // sync/curate, `Feed.runQuery(...)` returns fresh proxies for the
      // kept items, and any magazine refs to *deleted* posts now
      // reference proxies whose `_internals.database` link is unset —
      // `createRef` then tries to re-add them, hitting the
      // `!_objects.has(core.id)` invariant in `CoreDatabase.addCore`.
      // Until feed/db lifecycle is reworked we leave the feed unbounded;
      // the `Magazine.keep` bound (enforced in
      // `MagazineArticle.handleCurate`) prevents the visible list from
      // growing unboundedly.
      if (newPosts.length > 0) {
        const feedRef = Ref.make(subscriptionFeed);
        const postObjects = newPosts.map((post) =>
          Obj.make(Subscription.Post, {
            source: feedRef,
            title: post.title,
            link: post.link,
            description: post.description,
            author: post.author,
            published: post.published,
            guid: post.guid,
          }),
        );
        yield* Feed.append(echoFeed, postObjects);

        // Advance cursor to the newest post.
        const newestGuid = posts[0]?.guid;
        if (newestGuid) {
          Obj.update(subscriptionFeed, (subscriptionFeed) => {
            subscriptionFeed.cursor = newestGuid;
          });
        }

        // Update feed metadata from channel if not already set.
        if (feedMeta.name && !subscriptionFeed.name) {
          Obj.update(subscriptionFeed, (subscriptionFeed) => {
            subscriptionFeed.name = feedMeta.name;
          });
        }
        if (feedMeta.description && !subscriptionFeed.description) {
          Obj.update(subscriptionFeed, (subscriptionFeed) => {
            subscriptionFeed.description = feedMeta.description;
          });
        }
      }
    })
  ),
);

export default handler;
