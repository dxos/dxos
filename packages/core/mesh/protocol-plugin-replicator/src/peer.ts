//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { Event } from '@dxos/async';
import type { HypercoreFeed } from '@dxos/feed-store';
import { Extension, Protocol } from '@dxos/mesh-protocol';
import { Feed as FeedData } from '@dxos/protocols/proto/dxos/mesh/replicator';

const log = debug('dxos.replicator.peer');

export class Peer {
  private readonly _feeds = new Map<string, HypercoreFeed>();
  readonly closed = new Event();
  constructor (private _protocol: Protocol, private _extension: Extension) {}

  get feeds () {
    return this._feeds;
  }

  /**
   * Share feeds to the remote peer.
   */
  async share (feeds: FeedData | FeedData[] = []): Promise<void> {
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
      data: feeds.map(({ key, discoveryKey }) => ({ '@type': 'dxos.mesh.protocol.replicator.Feed', key, discoveryKey }))
    };

    await this._extension.send(message, { oneway: true });
  }

  /**
   * Replicate multiple feeds.
   */
  replicate (feeds: HypercoreFeed[] = []) {
    feeds.forEach(feed => this._replicate(feed));
  }

  /**
   * Close the peer.
   */
  close () {
    const { stream } = this._protocol;

    if (!stream.destroyed) {
      stream.destroy();
    }

    this.closed.emit();
  }

  /**
   * Replicate a feed.
   * @param {Hypercore} feed
   * @returns {boolean} - true if `feed.replicate` was called.
   * @private
   */
  _replicate (feed: HypercoreFeed): boolean {
    if (!feed || !feed.replicate) {
      return false;
    }

    const { stream } = this._protocol;

    if (stream.destroyed) {
      log('stream already destroyed, cannot replicate.');
      return false;
    }

    if (this._feeds.has(feed.key.toString('hex'))) {
      return true;
    }

    const replicateOptions = Object.assign({}, this._protocol.streamOptions, { stream, initiator: this._protocol.initiator });

    if (!replicateOptions.live && replicateOptions.expectedFeeds === undefined) {
      stream.expectedFeeds = stream.feeds.length + 1;
    }

    feed.replicate(replicateOptions);

    this._feeds.set(feed.key.toString('hex'), feed);

    log('stream replicated', feed.key.toString('hex'));

    return true;
  }
}
