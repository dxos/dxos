//
// Copyright 2021 DXOS.org
//

import { Readable } from 'readable-stream';

import { Stream } from '@dxos/codec-protobuf';
import { createBatchStream } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import {
  SubscribeToFeedsRequest,
  SubscribeToFeedsResponse,
  SubscribeToFeedBlocksRequest,
  SubscribeToFeedBlocksResponse
} from '@dxos/protocols/proto/dxos/devtools';

import { DevtoolsServiceDependencies } from './devtools-context';

export const subscribeToFeeds = (
  { echo }: DevtoolsServiceDependencies,
  { partyKey, feedKeys }: SubscribeToFeedsRequest
) => new Stream<SubscribeToFeedsResponse>(({ next }) => {
  if (!partyKey || feedKeys?.length === 0) {
    return;
  }

  const feedMap = new Map<PublicKey, { feedKey: PublicKey, stream: Readable, length: number }>();

  setTimeout(async () => {
    const { value: parties } = echo.queryParties();
    const party = parties.find(party => party.key.equals(partyKey));
    if (!party) {
      return;
    }

    const feeds = await party.getFeeds();
    feeds
      .filter(feed => !feedKeys?.length || feedKeys.some(feedKey => feedKey.equals(feed.key)))
      .forEach(feed => {
        let feedInfo = feedMap.get(feed.key);
        if (!feedInfo) {
          // TODO(wittjosiah): Start from timeframe?
          // TODO(wittjosiah): Bi-directional lazy loading to feed into virtualized table.
          // Tail feed so as to not overload the browser.
          const feedStream = new Readable({ objectMode: true })
            .wrap(createBatchStream(feed, {
              live: true,
              start: 0
            }) as any);

          feedStream.on('data', blocks => {
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
  { echo }: DevtoolsServiceDependencies,
  { partyKey, feedKey, maxBlocks = 10 }: SubscribeToFeedBlocksRequest
) => new Stream<SubscribeToFeedBlocksResponse>(({ next }) => {
  if (!partyKey || !feedKey) {
    return;
  }

  let feedStream: Readable;
  setTimeout(async () => {
    const { value: parties } = echo.queryParties();
    const party = parties.find(party => party.key.equals(partyKey));
    if (!party) {
      return;
    }

    const descriptor = await party.getFeeds().find(feed => feed.key.equals(feedKey));
    if (!descriptor) {
      return;
    }

    // TODO(wittjosiah): Start from timeframe?
    // TODO(wittjosiah): Bi-directional lazy loading to feed into virtualized table.
    // Tail feed so as to not overload the browser.
    feedStream = new Readable({ objectMode: true })
      .wrap(createBatchStream(descriptor, {
        live: true,
        start: Math.max(0, descriptor.feed.length - maxBlocks)
      }) as any);

    feedStream.on('data', blocks => {
      next({ blocks });
    });
  });

  return () => {
    feedStream?.destroy();
  };
});
