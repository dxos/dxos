//
// Copyright 2021 DXOS.org
//

import { Readable } from 'stream';

import { Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import {
  SubscribeToFeedsRequest,
  SubscribeToFeedsResponse,
  SubscribeToFeedBlocksRequest,
  SubscribeToFeedBlocksResponse
} from '@dxos/protocols/proto/dxos/devtools/host';

import { DevtoolsServiceDependencies } from './devtools-context';

export const subscribeToFeeds = ({ feedStore }: DevtoolsServiceDependencies, { feedKeys }: SubscribeToFeedsRequest) =>
  new Stream<SubscribeToFeedsResponse>(({ next }) => {
    if (feedKeys?.length === 0) {
      return;
    }

    const feedMap = new Map<PublicKey, { feedKey: PublicKey; stream: Readable; length: number }>();

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
  { feedStore }: DevtoolsServiceDependencies,
  { feedKey, maxBlocks = 10 }: SubscribeToFeedBlocksRequest
) =>
  new Stream<SubscribeToFeedBlocksResponse>(({ next }) => {
    if (!feedKey) {
      return;
    }

    let feedStream: Readable;
    setTimeout(async () => {
      const feed = await feedStore.getFeed(feedKey);
      if (!feed) {
        return;
      }

      // TODO(wittjosiah): Start from timeframe?
      // TODO(wittjosiah): Bi-directional lazy loading to feed into virtualized table.
      // Tail feed so as to not overload the browser.
      feedStream = new Readable({ objectMode: true }).wrap(feed.createReadableStream() as any);

      feedStream.on('data', (blocks) => {
        next({ blocks });
      });
    });

    return () => {
      feedStream?.destroy();
    };
  });
