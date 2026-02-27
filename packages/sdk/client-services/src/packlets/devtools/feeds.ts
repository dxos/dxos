//
// Copyright 2021 DXOS.org
//

import { SubscriptionList } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { type SpaceManager } from '@dxos/echo-pipeline';
import { FeedIterator, type FeedStore, type FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { create, protoToBuf } from '@dxos/protocols/buf';
import {
  type SubscribeToFeedBlocksRequest,
  type SubscribeToFeedBlocksResponse,
  SubscribeToFeedBlocksResponseSchema,
  type SubscribeToFeedsRequest,
  type SubscribeToFeedsResponse,
  SubscribeToFeedsResponseSchema,
  SubscribeToFeedsResponse_FeedSchema,
} from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { type FeedMessage } from '@dxos/protocols/buf/dxos/echo/feed_pb';
import { PublicKeySchema } from '@dxos/protocols/buf/dxos/keys_pb';
import { ComplexMap } from '@dxos/util';

type FeedOwner = {
  identity?: PublicKey;
  device?: PublicKey;
};

type FeedInfo = {
  feed: FeedWrapper<FeedMessage>;
  owner?: FeedOwner;
};

export const subscribeToFeeds = (
  { feedStore, spaceManager }: { feedStore: FeedStore<FeedMessage>; spaceManager: SpaceManager },
  request: SubscribeToFeedsRequest,
) => {
  const feedKeys = request.feedKeys?.map((k) => PublicKey.from(k.data));
  return new Stream<SubscribeToFeedsResponse>(({ next }) => {
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

      next(
        create(SubscribeToFeedsResponseSchema, {
          feeds: Array.from(feedMap.values()).map(({ feed, owner }) =>
            create(SubscribeToFeedsResponse_FeedSchema, {
              feedKey: create(PublicKeySchema, { data: feed.key.asUint8Array() }),
              length: feed.properties.length,
              bytes: feed.core.byteLength,
              downloaded: feed.core.bitfield?.data.toBuffer() ?? new Uint8Array(),
              owner: owner
                ? {
                    identity: owner.identity
                      ? create(PublicKeySchema, { data: owner.identity.asUint8Array() })
                      : undefined,
                    device: owner.device ? create(PublicKeySchema, { data: owner.device.asUint8Array() }) : undefined,
                  }
                : undefined,
            }),
          ),
        }),
      );
    };

    subscriptions.add(feedStore.feedOpened.on(update));
    update();

    return () => {
      subscriptions.clear();
    };
  });
};

const findFeedOwner = (spaceManager: SpaceManager, feedKey: PublicKey): FeedOwner | undefined => {
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
  request: SubscribeToFeedBlocksRequest,
) => {
  const feedKey = request.feedKey?.data ? PublicKey.from(request.feedKey.data) : undefined;
  const maxBlocks = request.maxBlocks ?? 10;
  return new Stream<SubscribeToFeedBlocksResponse>(({ next }) => {
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
          next(create(SubscribeToFeedBlocksResponseSchema, { blocks: [] }));
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

        next(
          create(SubscribeToFeedBlocksResponseSchema, {
            blocks: protoToBuf<SubscribeToFeedBlocksResponse['blocks']>(blocks.slice(-maxBlocks)),
          }),
        );

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
      clearTimeout(timeout);
    };
  });
};
