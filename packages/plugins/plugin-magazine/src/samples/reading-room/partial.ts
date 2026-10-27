//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import { Database, Obj, Ref, Tag } from '@dxos/echo';
import { StateMap, TagIndex } from '@dxos/schema';

import { Magazine, Subscription } from '#types';

import { type FeedKey, FEEDS, MAGAZINE, POSTS, READ, STARRED, feedSite, imageUrl, postSeed } from './feeds.ts';

export type Provides = {
  readonly feeds: Record<FeedKey, Subscription.Subscription>;
  readonly magazine: Magazine.Magazine;
};

/** Three subscriptions of imaged posts with their article bodies, and one curated magazine. Spec: `CONTENT.md`. */
export const Partial: SampleSpace.Partial<Provides> = SampleSpace.partial('reading-room', {
  schemas: [
    Subscription.Subscription,
    Subscription.Post,
    Subscription.PostContent,
    Magazine.Magazine,
    Instructions.Instructions,
    StateMap.StateMap,
    TagIndex.TagIndex,
    Tag.Tag,
  ],
  run: Effect.fnUntraced(function* () {
    const feeds = yield* SampleSpace.seed(FEEDS, ({ name, url, description }) =>
      Database.add(Subscription.makeSubscription({ name, url, description, type: 'rss' })),
    );

    const posts = yield* SampleSpace.seed(
      POSTS,
      Effect.fnUntraced(function* (seed) {
        const published = yield* SampleSpace.daysAgo(...seed.published);
        const image = imageUrl(seed.photo);
        return Subscription.makePost({
          source: Ref.make(feeds[seed.feed]),
          title: seed.title,
          link: `${feedSite(seed.feed)}/posts/${seed.key}`,
          description: `<p>${seed.summary}</p><img src="${image}" alt="${seed.title}">`,
          author: seed.author,
          published,
          guid: `${seed.feed}:${seed.key}`,
        });
      }),
    );

    // Refs into a feed resolve only once its posts are appended, and appends need the subscriptions
    // flushed, so the posts go in here rather than through the deferred `SampleSpace.appendToFeed`.
    yield* Database.flush();
    for (const { key } of FEEDS) {
      const feed = feeds[key].feed.target;
      if (!feed) {
        return yield* Effect.die(new Error(`The ${key} subscription has no post feed.`));
      }
      // Newest first, as a sync appends them.
      const entries = POSTS.filter((seed) => seed.feed === key)
        .map((seed) => posts[seed.key])
        .sort((postA, postB) => (postB.published ?? '').localeCompare(postA.published ?? ''));
      yield* Database.appendToFeed(feed, entries);
    }

    // Article bodies, so opening a post reads it without fetching the (fictional) source.
    for (const { key } of FEEDS) {
      const contentFeed = feeds[key].contentFeed?.target;
      if (!contentFeed) {
        return yield* Effect.die(new Error(`The ${key} subscription has no content feed.`));
      }
      const entries = yield* Effect.forEach(
        POSTS.filter((seed) => seed.feed === key),
        (seed) =>
          Effect.map(SampleSpace.daysAgo(...seed.published), (fetchedAt) =>
            Obj.make(Subscription.PostContent, {
              post: Ref.make(posts[seed.key]),
              text: [`![${seed.title}](${imageUrl(seed.photo)})`, seed.summary, ...seed.body].join('\n\n'),
              snippet: seed.summary,
              imageUrl: imageUrl(seed.photo),
              fetchedAt,
            }),
          ),
      );
      yield* SampleSpace.appendToFeed(contentFeed, entries);
    }

    const readAt = yield* SampleSpace.daysAgo(0, 8);
    for (const key of READ) {
      Subscription.setReadAt(feeds[postSeed(key).feed], posts[key].id, readAt);
    }

    // Each subscription indexes its own posts' tags.
    for (const key of STARRED) {
      yield* SampleSpace.tag([posts[key]], Subscription.SYSTEM_TAGS.starred.label, {
        index: feeds[postSeed(key).feed].tags.target,
        resolve: (db) => Tag.findOrCreate(db, Subscription.SYSTEM_TAGS.starred),
      });
    }

    const magazine = yield* Database.add(
      Magazine.make({
        name: MAGAZINE.name,
        instructions: MAGAZINE.topic,
        feeds: Object.values(feeds).map((feed) => Ref.make(feed)),
        // The magazine lists its newest addition last and displays the list reversed.
        posts: [...MAGAZINE.posts].reverse().map(({ key }) => Ref.make(posts[key])),
      }),
    );
    MAGAZINE.posts.forEach(({ key, snippet }, rank) => {
      Magazine.patchPostState(magazine, posts[key].id, {
        rank,
        snippet,
        imageUrl: imageUrl(postSeed(key).photo),
      });
    });

    yield* SampleSpace.collection('Reading Room', [
      Ref.make(magazine),
      ...Object.values(feeds).map((feed) => Ref.make(feed)),
    ]);

    return { feeds, magazine };
  }),
});
