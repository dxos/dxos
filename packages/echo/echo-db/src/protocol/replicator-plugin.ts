//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { Replicator } from '@dxos/protocol-plugin-replicator';

import { PartyFeedProvider } from '../pipeline';

const log = debug('dxos:echo-db:protocol:replicator');

/**
 * Creates the protocol plugin for feed replication.
 */
export const createReplicatorPlugin = (feedProvider: PartyFeedProvider) =>
  new Replicator({
    load: async () => {
      const feeds = feedProvider.getFeeds();
      log(`Loading feeds: ${feeds.map(feed => feed.key.toHex())}`);
      return feeds.map((feed) => ({ discoveryKey: feed.feed.discoveryKey }));
    },

    subscribe: (addFeedToReplicatedSet: (feed: any) => void) => feedProvider.feedOpened.on(async (feed) => {
      log(`Adding feed: ${feed.key.toHex()}`);
      addFeedToReplicatedSet({ discoveryKey: feed.feed.discoveryKey });
    }),

    replicate: async (remoteFeeds, info) => {
      // We can ignore remoteFeeds entirely, since the set of feeds we want to replicate is dictated by the Party.
      // TODO(telackey): Why are we opening feeds? Necessary or belt/braces thinking, or because open party does it?
      const feeds = feedProvider.getFeeds();
      log(`Replicating: peerId=${info.session}; feeds=${feeds.map(feed => feed.key.toHex())}`);
      return feeds.map(feed => feed.feed);
    }
  });
