//
// Copyright 2019 DxOS.
//

import { EventEmitter } from 'events';
import debug from 'debug';

const log = debug('dxos.replicator.peer');

export class Peer extends EventEmitter {
  /**
   * @param {Protocol} protocol
   * @param {Extension} extension
   * @param {CodecProtobuf} codec
   */
  constructor (protocol, extension, codec) {
    super();

    this._protocol = protocol;
    this._extension = extension;
    this._codec = codec;

    this._feeds = new Map();
  }

  get feeds () {
    return this._feeds;
  }

  /**
   * Share feeds to the remote peer.
   *
   * @param {(Object[]|Object)} [feeds] List of feeds of type: [{ key: Buffer, metadata: Buffer }]
   * @returns {Promise}
   */
  async share (feeds = []) {
    log('share', feeds);

    if (!Array.isArray(feeds)) {
      feeds = [feeds];
    }

    if (feeds.length === 0) {
      return;
    }

    const message = {
      __type_url: 'dxos.protocol.replicator.Container',
      type: 'share-feeds',
      data: feeds.map(({ key, discoveryKey, metadata }) => ({ __type_url: 'dxos.protocol.replicator.Feed', key, discoveryKey, metadata }))
    };

    await this._extension.send(message, { oneway: true });
  }

  /**
   * Replicate multiple feeds.
   * @param {Hypercore[]} feed
   */
  replicate (feeds = []) {
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

    this.emit('close');
  }

  /**
   * Replicate a feed.
   * @param {Hypercore} feed
   * @returns {boolean} - true if `feed.replicate` was called.
   * @private
   */
  _replicate (feed) {
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

    const replicateOptions = Object.assign({}, this._protocol.streamOptions, { stream });

    if (!replicateOptions.live && replicateOptions.expectedFeeds === undefined) {
      stream.expectedFeeds = stream.feeds.length + 1;
    }

    feed.replicate(replicateOptions);

    this._feeds.set(feed.key.toString('hex'), feed);

    log('stream replicated', feed.key.toString('hex'));

    return true;
  }
}
