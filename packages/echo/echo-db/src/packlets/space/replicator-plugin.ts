//
// Copyright 2022 DXOS.org
//

import { Replicator } from '@dxos/protocol-plugin-replicator';

import { FeedDescriptor } from '@dxos/feed-store';
import { Event } from '@dxos/async';
import { log } from '@dxos/log'

/**
 * Protocol plugin for feed replication.
 */
export class ReplicatorPlugin extends Replicator {
  private readonly _feedAdded = new Event<FeedDescriptor>();
  private readonly _feeds = new Set<FeedDescriptor>();

  addFeed (feed: FeedDescriptor) {
    log(`Adding feed: ${feed.key.toHex()}`);

    this._feeds.add(feed);
    this._feedAdded.emit(feed);
  }

  constructor() {
    super({
      load: async () => {
        const feeds = Array.from(this._feeds);
        log(`Loading feeds: ${feeds.map(feed => feed.key.toHex())}`);
        return feeds.map((feed) => ({ discoveryKey: feed.feed.discoveryKey }));
      },

      subscribe: (addFeedToReplicatedSet: (feed: any) => void) => this._feedAdded.on(async (feed) => {
        log(`Adding feed: ${feed.key.toHex()}`);
        addFeedToReplicatedSet({ discoveryKey: feed.feed.discoveryKey });
      }),

      replicate: async (remoteFeeds, info) => {
        // We can ignore remoteFeeds entirely, since the set of feeds we want to replicate is dictated by the Party.
        // TODO(telackey): Why are we opening feeds? Necessary or belt/braces thinking, or because open party does it?
        const feeds = Array.from(this._feeds);
        log(`Replicating: peerId=${info.session}; feeds=${feeds.map(feed => feed.key.toHex())}`);
        return feeds.map(feed => feed.feed);
      }
    });
  }
}
