//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { createFeedServiceLayer, getSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Feed, Obj, Ref } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { meta } from '#meta';

import { FeedOperation } from '../types';
import { Subscription } from '../types';
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
    Effect.fnUntraced(function* ({ feed: subscriptionFeed }) {
      const url = subscriptionFeed.url;
      invariant(url, 'Feed URL is required.');
      const echoFeed = subscriptionFeed.feed?.target;
      invariant(echoFeed, 'Backing ECHO feed not found.');
      invariant(Feed.getQueueUri(echoFeed), 'Feed not stored in a space.');
      const space = getSpace(subscriptionFeed);
      invariant(space, 'Space not found.');

      yield* Effect.tryPromise(async () => {
        const corsProxy = typeof window !== 'undefined' ? '/api/rss?url=' : undefined;
        const fetcher = getFetcher(subscriptionFeed.type);
        const { feed: feedMeta, posts } = await fetcher(url, { corsProxy });
        const cursor = subscriptionFeed.cursor;

        // Posts from the fetcher are sorted newest-first. The cursor is the guid
        // of the newest post from the previous sync. Slice everything before the
        // cursor position so that only genuinely new posts are appended.
        // If the cursor is not found (e.g. it rolled off the fetched window) fall
        // back to including all posts — some may be duplicates but new posts will
        // not be missed.
        const cursorIndex = cursor ? posts.findIndex((post) => post.guid === cursor) : -1;
        const newPosts = cursorIndex >= 0 ? posts.slice(0, cursorIndex) : posts;

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
          await Feed.append(echoFeed, postObjects).pipe(
            Effect.provide(createFeedServiceLayer(space.queues)),
            runAndForwardErrors,
          );
        }

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
      }).pipe(
        Effect.catchAll((error) => {
          log.catch(error);
          return Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.id}/sync-feed-error`,
            icon: 'ph--warning--regular',
            duration: 5_000,
            title: ['sync-feed-error.title', { ns: meta.id }],
          });
        }),
      );
    }),
  ),
);

export default handler;
