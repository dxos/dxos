//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { Event } from '@dxos/async';
import { FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { Extension, Protocol } from '@dxos/mesh-protocol';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import type { Feed as FeedData } from '@dxos/protocols/proto/dxos/mesh/replicator';
import { ComplexMap } from '@dxos/util';

const log = debug('dxos.replicator.peer');

export class Peer {
  // Active reeds being replicated.
  private readonly _feeds = new ComplexMap<PublicKey, FeedWrapper<FeedMessage>>(
    PublicKey.hash
  );

  readonly closed = new Event();

  constructor(private _protocol: Protocol, private _extension: Extension) {}

  /**
   * Share feeds to the remote peer.
   */
  async share(feeds: FeedData | FeedData[] = []): Promise<void> {
    log('share', feeds);

    if (!Array.isArray(feeds)) {
      feeds = [feeds];
    }

    if (feeds.length === 0) {
      return;
    }

    const message = {
      '@type': 'dxos.mesh.protocol.replicator.Container',
      type: 'share-feeds',
      data: feeds.map(({ key, discoveryKey }) => ({
        '@type': 'dxos.mesh.protocol.replicator.Feed',
        key,
        discoveryKey
      }))
    };

    await this._extension.send(message, { oneway: true });
  }

  /**
   * Replicate multiple feeds.
   */
  replicate(feeds: FeedWrapper<FeedMessage>[] = []) {
    feeds.forEach((feed) => this._replicate(feed));
  }

  /**
   * Close the peer.
   */
  close() {
    const { stream } = this._protocol;
    if (!stream.destroyed) {
      stream.destroy();
    }

    this.closed.emit();
  }

  /**
   * Replicate a feed.
   */
  _replicate(feed: FeedWrapper<FeedMessage>): boolean {
    const { stream } = this._protocol;
    if (stream.destroyed) {
      log('stream destroyed; cannot replicate.');
      return false;
    }

    // Already replicating.
    if (this._feeds.has(feed.key)) {
      return true;
    }

    // Start replication.
    feed.replicate(this._protocol.initiator, { stream, live: true });
    this._feeds.set(feed.key, feed);
    log('stream replicated', { feedKey: feed.key });
    return true;
  }
}
