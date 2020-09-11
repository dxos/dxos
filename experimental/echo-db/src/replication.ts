//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import hypercore from 'hypercore';

import { discoveryKey, keyToString } from '@dxos/crypto';
import { FeedKey, PartyKey } from '@dxos/experimental-echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { Protocol } from '@dxos/protocol';
import { Replicator } from '@dxos/protocol-plugin-replicator';

import { FeedSetProvider } from './parties';

const log = debug('dxos:echo:replication-adapter');

// TODO(burdon): Comment.
export interface IReplicationAdapter {
  start(): void
  stop(): void
}

export type ReplicatorFactory = (partyKey: PartyKey, activeFeeds: FeedSetProvider) => IReplicationAdapter;

export function createReplicatorFactory (networkManager: any, feedStore: FeedStore, peerId: Buffer) {
  return (partyKey: PartyKey, activeFeeds: FeedSetProvider) => new ReplicationAdapter(
    networkManager,
    feedStore,
    peerId,
    partyKey,
    activeFeeds
  );
}

/**
 * Joins a network swarm with replication protocol. Coordinates opening new feeds in the feed store.
 */
export class ReplicationAdapter implements IReplicationAdapter {
  private _started = false;

  constructor (
    // TODO(burdon): Underscores for private.
    private readonly networkManager: any,
    private readonly feedStore: FeedStore,
    private readonly peerId: Buffer,
    private readonly partyKey: PartyKey,
    private readonly activeFeeds: FeedSetProvider
  ) {}

  start (): void {
    if (this._started) {
      return;
    }

    this._started = true;

    this.networkManager.joinProtocolSwarm(this.partyKey, ({ channel }: any) => this._createProtocol(channel));
  }

  private _openFeed (key: FeedKey): hypercore.Feed {
    const topic = keyToString(this.partyKey);

    // Get the feed if we have it already, else create it.
    // TODO(marik-d): Rethink FeedStore API: Remove openFeed.
    let feed = this.feedStore.getOpenFeed(desc => desc.feed.key.equals(key));
    if (!feed) {
      // TODO(burdon): Change path.
      feed = this.feedStore.openFeed(keyToString(key), {
        key,
        metadata: { partyKey: this.partyKey }
      } as any);
    }

    return feed;
  }

  private _createProtocol (channel: any) {
    const replicator = new Replicator({
      load: async () => {
        const partyFeeds = await Promise.all(this.activeFeeds.get().map(feedKey => this._openFeed(feedKey)));
        log(`load feeds ${partyFeeds.map(feed => keyToString(feed.key))}`);
        return partyFeeds.map((feed) => {
          return { discoveryKey: feed.discoveryKey };
        });
      },

      subscribe: (addFeedToReplicatedSet: (feed: any) => void) => this.activeFeeds.added.on(async (feedKey) => {
        log(`add feed ${keyToString(feedKey)}`);
        const feed = await this._openFeed(feedKey);
        addFeedToReplicatedSet({ discoveryKey: feed.discoveryKey });
      }),

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      replicate: async (remoteFeeds: any, info: any) => {
        // We can ignore remoteFeeds entirely, because the set of feeds we want to replicate is dictated by the Party.
        // TODO(telackey): why are we opening feeds? Necessary or belt/braces thinking, or because open party does it?
        return Promise.all(this.activeFeeds.get().map(feedKey => this._openFeed(feedKey)));
      }
    });

    const protocol = new Protocol({
      streamOptions: {
        live: true
      },

      discoveryToPublicKey: (dk: any) => {
        if (!discoveryKey(this.partyKey).equals(dk)) {
          return undefined;
        }

        // TODO(marik-d): Why does this do side effects.
        // TODO(burdon): Remove need for external closure (i.e., pass object to this callback).
        protocol.setContext({ topic: keyToString(this.partyKey) });
        return this.partyKey;
      }
    })
      .setSession({ peerId: this.peerId })
      .setExtensions([replicator.createExtension()])
      .init(channel);
    return protocol;
  }

  stop (): void {
    if (!this._started) {
      return;
    }
    this._started = false;
    // TODO(marik-d): Not implmented
  }
}
