//
// Copyright 2021 DXOS.org
//

import bufferJson from 'buffer-json-encoding';

import { FeedDescriptor, FeedStore } from '@dxos/feed-store';

import { Feed } from './proto/gen/dxos/protocol/replicator';
import { Replicator } from './replicator';

const noop = () => {};

interface MiddlewareOptions {
  feedStore: FeedStore,
  onUnsubscribe?: (feedStore: FeedStore) => void,
  onLoad?: (feedStore: FeedStore) => Feed[],
}

const middleware = ({ feedStore, onUnsubscribe = noop, onLoad = () => [] }: MiddlewareOptions) => {
  const encodeFeed = (feed: Feed, descriptor?: FeedDescriptor) => ({
    key: feed.key,
    discoveryKey: feed.discoveryKey,
    metadata: descriptor?.metadata && bufferJson.encode(descriptor.metadata)
  });

  const decodeFeed = (feed: Feed) => ({
    key: feed.key,
    discoveryKey: feed.discoveryKey,
    metadata: feed.metadata && bufferJson.decode(feed.metadata)
  });

  return {
    subscribe (next: (feed: Feed) => void) {
      const onFeed = (feed: Feed, descriptor: FeedDescriptor) => next(encodeFeed(feed, descriptor));
      feedStore.on('feed', onFeed);
      return () => {
        onUnsubscribe(feedStore);
        feedStore.removeListener('feed', onFeed);
      };
    },
    async load () {
      const feeds = onLoad(feedStore);
      return feeds.map(
        feed => encodeFeed(
          feed,
          feedStore.getDescriptorByDiscoveryKey(feed.discoveryKey as any)
        )
      );
    },
    async replicate (feeds: any[]) {
      return Promise.all(feeds.map((feed) => {
        const { key, discoveryKey, metadata } = decodeFeed(feed);

        if (key) {
          const feed = feedStore.getOpenFeed(d => d.key.equals(key));

          if (feed) {
            return feed;
          }

          return feedStore.openFeed(`/remote/${key.toString()}`, {
            key: Buffer.from(key),
            metadata
          } as any);
        }

        if (discoveryKey) {
          return feedStore.getOpenFeed(d => d.discoveryKey.equals(discoveryKey));
        }

        return null;
      }));
    }
  };
};

export class DefaultReplicator extends Replicator {
  constructor (...opts: Parameters<typeof middleware>) {
    super(middleware(...opts));
  }
}
