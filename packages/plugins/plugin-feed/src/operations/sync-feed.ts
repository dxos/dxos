//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';
import { fetchRss } from '../util';

import { SyncFeed } from './definitions';

const handler: Operation.WithHandler<typeof SyncFeed> = SyncFeed.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ feed: subscriptionFeed }) {
      const url = subscriptionFeed.url;
      invariant(url, 'Feed URL is required.');

      yield* Effect.tryPromise(async () => {
        const { feed: feedMeta, posts } = await fetchRss(url);

        // Add posts to the space database.
        // TODO(feed): Deduplicate by guid against existing posts.
        // TODO(feed): Use Feed.append when Feed.Service layer is available.
        if (posts.length > 0) {
          const db = Obj.getDatabase(subscriptionFeed);
          invariant(db);
          for (const post of posts) {
            db.add(post);
          }
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
