//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { FeedWrapper } from '@dxos/feed-store';
import { log } from '@dxos/log';
import { ReplicatorPlugin as AbstractReplicatorPlugin } from '@dxos/protocol-plugin-replicator';

/**
 * Protocol plugin for feed replication.
 */
// TODO(burdon): Should this extend or create the plugin?
export class ReplicatorPlugin extends AbstractReplicatorPlugin {
  private readonly _feedAdded = new Event<FeedWrapper>();
  private readonly _feeds = new Set<FeedWrapper>();

  addFeed (feed: FeedWrapper) {
    log('Adding feed', { feed: feed.key });

    this._feeds.add(feed);
    this._feedAdded.emit(feed);
  }

  constructor () {
    super({
      load: async () => {
        const feeds = Array.from(this._feeds);
        log('Loading feeds', { feeds: feeds.map(feed => feed.key) });
        return feeds.map((feed) => ({ discoveryKey: feed.properties.discoveryKey }));
      },

      subscribe: (addFeedToReplicatedSet: (feed: any) => void) => this._feedAdded.on(async (feed) => {
        log('Adding feed', { feed: feed.key });
        addFeedToReplicatedSet({ discoveryKey: feed.properties.discoveryKey });
      }),

      replicate: async (remoteFeeds, info) => {
        const feeds = Array.from(this._feeds);
        log('Replicating', { peerId: info.session, feeds: feeds.map(feed => feed.key) });
        return feeds;
      }
    });
  }
}
