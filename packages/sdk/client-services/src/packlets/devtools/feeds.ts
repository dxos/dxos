//
// Copyright 2021 DXOS.org
//

import { EventSubscriptions } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { FeedIterator, FeedStore, FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
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
    let iterator: FeedIterator<FeedMessage>;
    setImmediate(async () => {
      const feed = await feedStore.getFeed(feedKey);
      if (!feed) {
        return;
      }

      iterator = new FeedIterator(feed);
      await iterator.open();

      for await (const block of iterator) {
        next({ blocks: [block] });
      }
    });

    return () => {
      iterator?.close().catch((err) => log.catch(err));
    };
  });
