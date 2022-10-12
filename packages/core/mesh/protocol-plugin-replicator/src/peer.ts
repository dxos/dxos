//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import { ReplicationOptions } from 'hypercore';

import { Event } from '@dxos/async';
import { FeedDescriptor } from '@dxos/feed-store';
import { Extension, Protocol } from '@dxos/mesh-protocol';
import { Feed as FeedData } from '@dxos/protocols/proto/dxos/mesh/replicator';

const log = debug('dxos.replicator.peer');

export class Peer {
  private readonly _feeds = new Map<string, FeedDescriptor>();

  readonly closed = new Event();

  constructor (
    private _protocol: Protocol,
    private _extension: Extension
  ) {}

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
  replicate (feeds: FeedDescriptor[] = []) {
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
   * @param {FeedDescriptor} feedDescriptor
   * @returns {boolean} - true if `feed.replicate` was called and succeeds.
   * @private
   */
  _replicate (feedDescriptor: FeedDescriptor): boolean {
    if (!feedDescriptor || !feedDescriptor.feed.replicate) { // TODO(burdon): What does this test?
      return false;
    }

    const { stream } = this._protocol;
    if (stream.destroyed) {
      log('Stream already destroyed, cannot replicate.');
      return false;
    }

    if (this._feeds.has(feedDescriptor.key.toHex())) {
      return true;
    }

    const options: ReplicationOptions = Object.assign({}, this._protocol.streamOptions, {
      initiator: this._protocol.initiator,
      stream // TODO(burdon): ???
    });

    // TODO(burdon): These options don't match the API.
    if (!options.live && options.expectedFeeds === undefined) {
      stream.expectedFeeds = stream.feeds.length + 1;
    }

    feedDescriptor.feed.replicate(options as any);
    this._feeds.set(feedDescriptor.key.toHex(), feedDescriptor);

    log('stream replicated', feedDescriptor.key.toHex());
    return true;
  }
}
