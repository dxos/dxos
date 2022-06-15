//
// Copyright 2021 DXOS.org
//

import { Readable } from 'readable-stream';

import { Stream } from '@dxos/codec-protobuf';
import { createBatchStream } from '@dxos/feed-store';

import { SubscribeToFeedRequest, SubscribeToFeedResponse, SubscribeToFeedsResponse } from '../proto/gen/dxos/devtools';
import { DevtoolsServiceDependencies } from './devtools-context';

export const subscribeToFeeds = ({ echo }: DevtoolsServiceDependencies) => {
  return new Stream<SubscribeToFeedsResponse>(({ next }) => {
    const update = () => {
      const { value: parties } = echo.queryParties();
      next({
        parties: parties.map(party => ({
          key: party.key,
          feeds: party.feedProvider.getFeeds().map(feed => feed.key),
        }))
      });
    };

    const partySubscriptions: Record<string, () => void> = {};
    const unsubscribe = echo.queryParties().subscribe((parties) => {
      parties.forEach((party) => {
        if (!partySubscriptions[party.key.toHex()]) {
          // Send updates on timeframe changes.
          partySubscriptions[party.key.toHex()] = party.timeframeUpdate.on(() => update());
        }
      });

      // Send feeds for new parties.
      update();
    });

    // Send initial feeds.
    update();

    return () => {
      unsubscribe();
      Object.values(partySubscriptions).forEach(unsubscribe => unsubscribe());
    };
  });
};

export const subscribeToFeed = (
  { echo }: DevtoolsServiceDependencies,
  { partyKey, feedKey }: SubscribeToFeedRequest
) => {
  return new Stream<SubscribeToFeedResponse>(({ next }) => {
    if (!partyKey || !feedKey) {
      return;
    }

    let feedStream: Readable;
    setImmediate(async () => {
      const { value: parties } = echo.queryParties();
      const party = parties.find(party => party.key.equals(partyKey));
      if (!party) {
        return;
      }

      const { feed } = await party.feedProvider.createOrOpenReadOnlyFeed(feedKey);

      // TODO(wittjosiah): Start from timeframe?
      // TODO(wittjosiah): Bidirectional lazy loading to feed into virtualized table.
      // Tail feed so as to not overload the browser.
      feedStream = new Readable({ objectMode: true })
        .wrap(createBatchStream(feed, { live: true, start: Math.max(0, feed.length - 10) }));

      feedStream.on('data', blocks => {
        next({ blocks });
      });
    });

    return () => {
      feedStream?.destroy();
    };
  });
};
