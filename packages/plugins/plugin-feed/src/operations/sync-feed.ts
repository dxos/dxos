//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Feed, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';
import { Subscription } from '../types';
import { fetchRss } from '../util';

import { SyncFeed } from './definitions';

const handler: Operation.WithHandler<typeof SyncFeed> = SyncFeed.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ feed: subscriptionFeed }) {
      const url = subscriptionFeed.url;
      invariant(url, 'Feed URL is required.');
      const echoFeed = subscriptionFeed.feed?.target;
      invariant(echoFeed, 'Backing ECHO feed not found.');

      yield* Effect.gen(function* () {
        const corsProxy = typeof window !== 'undefined' ? '/api/rss?url=' : undefined;
        const { feed: feedMeta, posts } = yield* Effect.promise(() => fetchRss(url, { corsProxy }));

        if (posts.length > 0) {
          const postObjects = posts.map((post) =>
            Obj.make(Subscription.Post, {
              title: post.title,
              link: post.link,
              description: post.description,
              author: post.author,
              published: post.published,
              guid: post.guid,
            }),
          );
          yield* Feed.append(echoFeed, postObjects);
        }

        // Update feed metadata from channel if not already set.
        if (feedMeta.name && !subscriptionFeed.name) {
          Obj.change(subscriptionFeed, (obj) => {
            obj.name = feedMeta.name;
          });
        }
        if (feedMeta.description && !subscriptionFeed.description) {
          Obj.change(subscriptionFeed, (obj) => {
            obj.description = feedMeta.description;
          });
        }
      }).pipe(
        Effect.catchAll((error) => {
          log.catch(error);
          return Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.id}/sync-feed-error`,
            icon: 'ph--warning--regular',
            duration: 5_000,
            title: ['sync feed error title', { ns: meta.id }],
          });
        }),
      );
    }),
  ),
);

export default handler;
