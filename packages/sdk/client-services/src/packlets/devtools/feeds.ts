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

    const update = () => {
      const feeds = feedStore.feeds;
      feeds
        .filter((feed) => !feedKeys?.length || feedKeys.some((feedKey) => feedKey.equals(feed.key)))
        .forEach((feed) => {
          if (!feedMap.has(feed.key)) {
            feedMap.set(feed.key, feed);
            feed.on('close', update);
            subscriptions.add(feed.off('close', update));
          }
        });
      next({
        feeds: Array.from(feedMap.values()).map((feed) => ({ feedKey: feed.key, length: feed.properties.length }))
      });
    };

    subscriptions.add(feedStore.feedOpened.on(update));
    update();

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
    const subscriptions = new EventSubscriptions();

    setImmediate(async () => {
      const feed = feedStore.getFeed(feedKey);
      if (!feed) {
        return;
      }

      const update = async () => {
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

      feed.on('append', update);
      subscriptions.add(() => feed.off('append', update));

      feed.on('truncate', update);
      subscriptions.add(() => feed.off('truncate', update));
      await update();
    });

    return () => {
      subscriptions.clear();
    };
  });
