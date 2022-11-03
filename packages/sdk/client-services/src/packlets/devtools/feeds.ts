//
// Copyright 2021 DXOS.org
//

import { EventSubscriptions } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { FeedIterator, FeedStore, FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import {
  SubscribeToFeedsRequest,
  SubscribeToFeedsResponse,
  SubscribeToFeedBlocksRequest,
  SubscribeToFeedBlocksResponse
} from '@dxos/protocols/proto/dxos/devtools/host';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { ComplexMap } from '@dxos/util';

export const subscribeToFeeds = (
  { feedStore }: { feedStore: FeedStore<FeedMessage> },
  { feedKeys }: SubscribeToFeedsRequest
) =>
  new Stream<SubscribeToFeedsResponse>(({ next }) => {
    if (feedKeys?.length === 0) {
      return;
    }

    const feedMap = new ComplexMap<PublicKey, FeedWrapper<FeedMessage>>(PublicKey.hash);
    const subscriptions = new EventSubscriptions();

    const update = async () => {
      const feeds = await feedStore.feeds;
      feeds
        .filter((feed) => !feedKeys?.length || feedKeys.some((feedKey) => feedKey.equals(feed.key)))
        .forEach((feed) => {
          if (!feedMap.has(feed.key)) {
            feedMap.set(feed.key, feed);
            subscriptions.add(feed.on('close', update));
          }
        });
      next({
        feeds: Array.from(feedMap.values()).map((feed) => ({ feedKey: feed.key, length: feed.properties.length }))
      });
    };

    setImmediate(async () => {
      subscriptions.add(feedStore.feedOpened.on(update));
      await update();
    });

    return () => {
      subscriptions.clear();
    };
  });

export const subscribeToFeedBlocks = (
  { feedStore }: { feedStore: FeedStore<FeedMessage> },
  { feedKey, maxBlocks = 10 }: SubscribeToFeedBlocksRequest
) =>
  new Stream<SubscribeToFeedBlocksResponse>(({ next }) => {
    if (!feedKey) {
      return;
    }

    const update = async (feed: FeedWrapper<FeedMessage>) => {
      const iterator = new FeedIterator(feed);
      await iterator.open();
      const blocks = [];
      for await (const block of iterator) {
        blocks.push(block);
        if (blocks.length >= feed.properties.length) {
          break;
        }
      }
      next({
        blocks: blocks.slice(-maxBlocks)
      });
      await iterator.close();
    };
    const subscriptions = new EventSubscriptions();

    setImmediate(async () => {
      const feed = await feedStore.getFeed(feedKey);
      if (!feed) {
        return;
      }
      subscriptions.add(feed.on('append', () => update(feed)));
      subscriptions.add(feed.on('truncate', () => update(feed)));
      await update(feed);
    });

    return () => {
      subscriptions.clear();
    };
  });
