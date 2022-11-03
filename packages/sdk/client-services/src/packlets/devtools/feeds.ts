//
// Copyright 2021 DXOS.org
//

import { Readable } from 'stream';

import { Stream } from '@dxos/codec-protobuf';
import { FeedIterator, FeedStore } from '@dxos/feed-store';
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

    const feedMap = new ComplexMap<PublicKey, { feedKey: PublicKey; stream: Readable; length: number }>(PublicKey.hash);

    setTimeout(async () => {
      const feeds = await feedStore.feeds;
      feeds
        .filter((feed) => !feedKeys?.length || feedKeys.some((feedKey) => feedKey.equals(feed.key)))
        .forEach((feed) => {
          let feedInfo = feedMap.get(feed.key);
          if (!feedInfo) {
            // TODO(wittjosiah): Start from timeframe?
            // TODO(wittjosiah): Bi-directional lazy loading to feed into virtualized table.
            // Tail feed so as to not overload the browser.
            const feedStream = new Readable({ objectMode: true }).wrap(feed.createReadableStream() as any);

            feedStream.on('data', (blocks) => {
              feedInfo!.length += blocks.length;

              next({
                feeds: Array.from(feedMap.values()).map(({ feedKey, length }) => ({
                  feedKey,
                  length
                }))
              });
            });

            feedInfo = {
              feedKey: feed.key,
              stream: feedStream,
              length: 0
            };

            feedMap.set(feed.key, feedInfo);
          }
        });
    });

    return () => {
      feedMap.forEach(({ stream }) => stream.destroy());
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

      const update = async () => {
        for await (const block of iterator) {
          next({ blocks: [block] });
        }
      };

      await update();
    });

    return () => {
      iterator?.close().catch((err) => log.catch(err));
    };
  });
