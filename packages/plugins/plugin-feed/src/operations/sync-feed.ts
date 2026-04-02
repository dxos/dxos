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
import { Subscription } from '../types';

import { SyncFeed } from './definitions';

const handler: Operation.WithHandler<typeof SyncFeed> = SyncFeed.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ feed: subscriptionFeed }) {
      const url = subscriptionFeed.url;
      invariant(url, 'Feed URL is required.');
      const echoFeed = subscriptionFeed.feed?.target;
      invariant(echoFeed, 'Backing ECHO feed not found.');

      yield* Effect.tryPromise(async () => {
        const { XMLParser } = await import('fast-xml-parser');
        const response = await fetch(url);
        const xml = await response.text();
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
        const parsed = parser.parse(xml);

        const channel = parsed.rss?.channel ?? parsed.feed;
        if (!channel) {
          throw new Error('Unrecognized feed format');
        }

        const isAtom = !parsed.rss;
        const items: any[] = (isAtom ? channel.entry : channel.item) ?? [];
        const itemList = Array.isArray(items) ? items : [items];

        // Build new post objects.
        const newPosts = itemList.map((item) => {
          const link = isAtom
            ? ((Array.isArray(item.link)
                ? item.link.find((linkItem: any) => linkItem['@_rel'] === 'alternate')?.['@_href']
                : item.link?.['@_href']) ?? '')
            : (item.link ?? '');

          return Subscription.makePost({
            title: isAtom ? (item.title?.['#text'] ?? item.title) : item.title,
            link,
            description: isAtom ? (item.summary ?? item.content?.['#text'] ?? item.content) : (item.description ?? ''),
            author: isAtom ? (item.author?.name ?? item.author) : (item['dc:creator'] ?? item.author),
            published: item.pubDate ?? item.published ?? item.updated,
            guid: isAtom ? item.id : (item.guid?.['#text'] ?? item.guid ?? link),
          });
        });

        // TODO(feed): Deduplicate by guid against existing posts once Feed.query is available in this context.
        if (newPosts.length > 0) {
          const db = Obj.getDatabase(subscriptionFeed);
          invariant(db);
          for (const post of newPosts) {
            db.add(post);
          }
          // TODO(feed): Use Feed.append when Feed.Service layer is available.
        }

        // Update feed metadata from channel.
        const channelTitle = isAtom ? (channel.title?.['#text'] ?? channel.title) : channel.title;
        const channelDescription = isAtom ? channel.subtitle : channel.description;

        if (channelTitle && !subscriptionFeed.name) {
          Obj.change(subscriptionFeed, (obj) => {
            obj.name = channelTitle;
          });
        }
        if (channelDescription && !subscriptionFeed.description) {
          Obj.change(subscriptionFeed, (obj) => {
            obj.description = channelDescription;
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
