//
// Copyright 2021 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { SubscriptionList } from '@dxos/async';
import { EffectEx } from '@dxos/effect';
import { FeedIterator, type FeedStore, type FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type SubscribeToFeedBlocksResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type DevtoolsHost } from '@dxos/protocols/rpc';
import { ComplexMap } from '@dxos/util';

import { type SpaceManager } from '../space/index.ts';

type FeedInfo = {
  feed: FeedWrapper<FeedMessage>;
  owner?: DevtoolsHost.SubscribeToFeedsResponse.FeedOwner;
};

export const subscribeToFeeds = (
  { feedStore, spaceManager }: { feedStore: FeedStore<FeedMessage>; spaceManager: SpaceManager },
  { feedKeys }: DevtoolsHost.SubscribeToFeedsRequest,
): EffectStream.Stream<DevtoolsHost.SubscribeToFeedsResponse, Error> => {
  return EffectEx.streamFromEmitter<DevtoolsHost.SubscribeToFeedsResponse, Error>((emit) => {
    const subscriptions = new SubscriptionList();
    const feedMap = new ComplexMap<PublicKey, FeedInfo>(PublicKey.hash);

    const update = () => {
      const { feeds } = feedStore;
      feeds
        .filter((feed) => !feedKeys?.length || feedKeys.some((feedKey) => feedKey.equals(feed.key)))
        .forEach((feed) => {
          if (!feedMap.has(feed.key)) {
            feedMap.set(feed.key, { feed });
            feed.on('close', update);
            subscriptions.add(() => feed.off('close', update));
          }
          if (!feedMap.get(feed.key)?.owner) {
            feedMap.get(feed.key)!.owner = findFeedOwner(spaceManager, feed.key);
          }
        });

      emit.single({
        feeds: Array.from(feedMap.values()).map(({ feed, owner }) => ({
          feedKey: feed.key,
          length: feed.properties.length,
          bytes: feed.core.byteLength,
          downloaded: feed.core.bitfield?.data.toBuffer() ?? new Uint8Array(),
          owner,
        })),
      });
    };

    subscriptions.add(feedStore.feedOpened.on(update));
    update();

    return Effect.sync(() => {
      subscriptions.clear();
    });
  });
};

const findFeedOwner = (
  spaceManager: SpaceManager,
  feedKey: PublicKey,
): DevtoolsHost.SubscribeToFeedsResponse.FeedOwner | undefined => {
  const feedInfo = [...spaceManager.spaces.values()]
    .flatMap((space) => [...space.spaceState.feeds.values()])
    .find((feed) => feed.key.equals(feedKey));
  log('feeds', { feedInfo, key: feedKey.truncate(), allSpaces: spaceManager.spaces.size });
  if (!feedInfo) {
    return undefined;
  }
  return {
    identity: feedInfo.assertion.identityKey,
    device: feedInfo.assertion.deviceKey,
  };
};

export const subscribeToFeedBlocks = (
  { feedStore }: { feedStore: FeedStore<FeedMessage> },
  { feedKey, maxBlocks = 10 }: DevtoolsHost.SubscribeToFeedBlocksRequest,
): EffectStream.Stream<SubscribeToFeedBlocksResponse, Error> => {
  return EffectEx.streamFromEmitter<SubscribeToFeedBlocksResponse, Error>((emit) => {
    if (!feedKey) {
      return;
    }

    const subscriptions = new SubscriptionList();

    const timeout = setTimeout(async () => {
      const feed = feedStore.getFeed(feedKey);
      if (!feed) {
        return;
      }

      const update = async () => {
        if (!feed.properties.length) {
          emit.single({ blocks: [] });
          return;
        }

        const iterator = new FeedIterator(feed);
        await iterator.open();
        const blocks = [];
        for await (const block of iterator) {
          blocks.push(block);
          if (blocks.length >= feed.properties.length) {
            break;
          }
        }

        emit.single({
          blocks: blocks.slice(-maxBlocks),
        });

        await iterator.close();
      };

      feed.on('append', update);
      subscriptions.add(() => feed.off('append', update));

      feed.on('truncate', update);
      subscriptions.add(() => feed.off('truncate', update));
      await update();
    });

    return Effect.sync(() => {
      subscriptions.clear();
      clearTimeout(timeout);
    });
  });
};
