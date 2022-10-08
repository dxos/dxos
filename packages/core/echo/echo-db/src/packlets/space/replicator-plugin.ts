//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { FeedDescriptor } from '@dxos/feed-store';
import { log } from '@dxos/log';
import { ReplicatorPlugin as AbstractReplicatorPlugin } from '@dxos/protocol-plugin-replicator';

/**
 * Protocol plugin for feed replication.
 */
// TODO(burdon): Should this extend or create the plugin?
export class ReplicatorPlugin extends AbstractReplicatorPlugin {
  private readonly _feedAdded = new Event<FeedDescriptor>();
  private readonly _feeds = new Set<FeedDescriptor>();

  addFeed (feed: FeedDescriptor) {
    log('Adding feed', { feed: feed.key });

    this._feeds.add(feed);
    this._feedAdded.emit(feed);
  }

  constructor () {
    super({
      load: async () => {
        const feeds = Array.from(this._feeds);
        log('Loading feeds', { feeds: feeds.map(feed => feed.key) });
        return feeds.map((feed) => ({ discoveryKey: feed.discoveryKey }));
      },

      subscribe: (addFeedToReplicatedSet: (feed: any) => void) => this._feedAdded.on(async (feed) => {
        log('Adding feed', { feed: feed.key });
        addFeedToReplicatedSet({ discoveryKey: feed.discoveryKey });
      }),

      replicate: async (remoteFeeds, info) => {
        const feeds = Array.from(this._feeds);
        log('Replicating', { peerId: info.session, feeds: feeds.map(feed => feed.key) });
        return feeds;
      }
    });
  }
}
