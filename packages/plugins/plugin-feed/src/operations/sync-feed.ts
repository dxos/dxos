//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { getSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Feed, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { meta } from '#meta';

import { Subscription } from '../types';
import { type FeedFetcher, fetchAtproto, fetchRss } from '../util';
import { SyncFeed } from './definitions';

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

const handler: Operation.WithHandler<typeof SyncFeed> = SyncFeed.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ feed: subscriptionFeed }) {
      const url = subscriptionFeed.url;
      invariant(url, 'Feed URL is required.');
      const echoFeed = subscriptionFeed.feed?.target;
      invariant(echoFeed, 'Backing ECHO feed not found.');
      const feedDxn = Feed.getQueueDxn(echoFeed);
      invariant(feedDxn, 'Feed not stored in a space.');
      const space = getSpace(subscriptionFeed);
      invariant(space, 'Space not found.');

      yield* Effect.tryPromise(async () => {
        const corsProxy = typeof window !== 'undefined' ? '/api/rss?url=' : undefined;
        const fetcher = getFetcher(subscriptionFeed.type);
        const { feed: feedMeta, posts } = await fetcher(url, { corsProxy });
        const cursor = subscriptionFeed.cursor;

        // Filter posts newer than the cursor.
        const newPosts = cursor ? posts.filter((post) => post.guid !== cursor) : posts;

        // Append new posts to the ECHO feed queue.
        // NOTE: The `Subscription.Feed.keep` bound is currently NOT enforced
        // here via `queue.delete()`. Doing so wipes the queue's `_objectCache`
        // for the deleted posts, but those same Post objects persist in
        // `space.db` (they were added there when first curated into a
        // Magazine via `createRef` → `database.add`). On the next sync/curate,
        // `queue.queryObjects()` returns fresh proxies for the kept items,
        // and any magazine refs to *deleted* posts now reference proxies
        // whose `_internals.database` link is unset — `createRef` then tries
        // to re-add them, hitting the `!_objects.has(core.id)` invariant in
        // `CoreDatabase.addCore`. Until queue/db lifecycle is reworked we
        // leave the queue unbounded; the `Magazine.keep` bound (enforced in
        // `MagazineArticle.handleCurate`) prevents the visible list from
        // growing unboundedly.
        const queue = space.queues.get(feedDxn);
        if (newPosts.length > 0) {
          const feedRef = Ref.make(subscriptionFeed);
          const postObjects = newPosts.map((post) =>
            Obj.make(Subscription.Post, {
              feed: feedRef,
              title: post.title,
              link: post.link,
              description: post.description,
              author: post.author,
              published: post.published,
              guid: post.guid,
            }),
          );
          await queue.append(postObjects);
        }

        // Advance cursor to the newest post.
        const newestGuid = posts[0]?.guid;
        if (newestGuid) {
          Obj.change(subscriptionFeed, (subscriptionFeed) => {
            subscriptionFeed.cursor = newestGuid;
          });
        }

        // Update feed metadata from channel if not already set.
        if (feedMeta.name && !subscriptionFeed.name) {
          Obj.change(subscriptionFeed, (subscriptionFeed) => {
            subscriptionFeed.name = feedMeta.name;
          });
        }
        if (feedMeta.description && !subscriptionFeed.description) {
          Obj.change(subscriptionFeed, (subscriptionFeed) => {
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
