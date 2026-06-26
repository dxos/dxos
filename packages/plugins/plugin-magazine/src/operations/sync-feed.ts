//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { FeedOperation, Subscription } from '../types';
import { browserCorsProxy, type FeedFetcher, fetchRss, fetchStandardSite } from './sources';

/** Stable dedup key for a {@link Subscription.Post}. Both fields are optional, but every current fetcher populates `guid` (RSS falls back to `link`, Standard.site uses the record AT-URI). */
const postKey = (post: { guid?: string; link?: string }): string | undefined => post.guid ?? post.link;

/** Resolves the appropriate fetcher for the given feed type. */
const getFetcher = (type: Subscription.FeedType | undefined): FeedFetcher => {
  switch (type) {
    case 'standard-site':
      return fetchStandardSite;
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

      const fetcher = getFetcher(subscriptionFeed.type);
      const { feed: feedMeta, posts } = yield* fetcher(url, {
        corsProxy: browserCorsProxy(),
        publication: subscriptionFeed.site,
      });

      // Dedup against existing posts already in the backing queue. The
      // `cursor` field on the subscription was previously used as a single-guid
      // filter, but RSS feeds re-serve the same items across polls — filtering
      // out only the cursor's own guid let every other previously-synced post
      // re-pass the filter and re-append on each sync. Key-based dedup against
      // the queue is the source of truth and tolerant of out-of-order or
      // rotated-off-the-window upstream responses.
      //
      // The dedup key is `guid ?? link`: `Post.guid` is optional in the schema,
      // and while every current fetcher populates it (RSS falls back to `link`,
      // Standard.site uses the record AT-URI), a future fetcher or malformed item
      // could omit it. Falling back to `link` keeps such items dedup-able. Items
      // with neither field cannot be deduplicated and will sync as new every
      // time — that's an upstream data quality issue with no clean recovery.
      //
      // Pull the backing queue before reading existing posts: this handler runs in a
      // freshly-spawned process whose local queue replica may not have the blocks yet. Without
      // this, `runQuery` returns an empty set, `seenKeys` is empty, and every fetched item
      // re-appends — duplicating the whole feed on a cold sync.
      yield* Feed.sync(echoFeed, { shouldPush: false });
      const existing = yield* Feed.runQuery(echoFeed, Filter.type(Subscription.Post));
      const seenKeys = new Set<string>();
      for (const post of existing) {
        const key = postKey(post);
        if (key) {
          seenKeys.add(key);
        }
      }
      const newPosts: typeof posts = [];
      for (const post of posts) {
        const key = postKey(post);
        // Within-batch dedup: if the upstream serves the same item twice in one
        // response, only the first occurrence is appended.
        if (key && seenKeys.has(key)) {
          continue;
        }
        if (key) {
          seenKeys.add(key);
        }
        newPosts.push(post);
      }

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
      // `!_objects.has(core.id)` invariant in `EntityManager.addCore`.
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
            // Persist the body so Standard.site articles render offline (see `load-post-content`);
            // RSS `content:encoded` rides along but its fetch path is unchanged.
            content: post.content,
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
    }),
  ),
);

export default handler;
