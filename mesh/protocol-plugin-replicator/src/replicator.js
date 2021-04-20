//
// Copyright 2019 DxOS.
//

import { EventEmitter } from 'events';
import assert from 'assert';
import bufferJson from 'buffer-json-encoding';

import { Extension } from '@dxos/protocol';

import { Peer } from './peer';
import schema from './schema.json';

// const log = debug('dxos.replicator');

const defaultReplicate = () => {};
const defaultSubscribe = () => () => {};

/**
 * Manages key exchange and feed replication.
 */
export class Replicator extends EventEmitter {
  static extension = 'dxos.protocol.replicator';

  /**
   * @param {Middleware} middleware
   * @param {Object} [options]
   * @param {number} [options.timeout=1000]
   */
  constructor (middleware, options) {
    assert(middleware);
    assert(middleware.load);

    const { load, subscribe = defaultSubscribe, replicate = defaultReplicate } = middleware;

    super();

    this._load = async (...args) => load(...args);
    this._subscribe = (...args) => subscribe(...args);
    this._replicate = async (...args) => replicate(...args);

    this._options = Object.assign({
      timeout: 1000
    }, options);

    this._peers = new Map();
  }

  toString () {
    const meta = {};

    return `Replicator(${JSON.stringify(meta)})`;
  }

  /**
   * Creates a protocol extension for key exchange.
   * @return {Extension}
   */
  createExtension () {
    return new Extension(Replicator.extension, {
      schema: JSON.parse(schema),
      timeout: this._options.timeout
    })
      .on('error', err => this.emit(err))
      .setInitHandler(this._initHandler.bind(this))
      .setHandshakeHandler(this._handshakeHandler.bind(this))
      .setMessageHandler(this._messageHandler.bind(this))
      .setCloseHandler(this._closeHandler.bind(this))
      .setFeedHandler(this._feedHandler.bind(this));
  }

  async _initHandler (protocol) {
    const extension = protocol.getExtension(Replicator.extension);

    const peer = new Peer(protocol, extension);

    this._peers.set(protocol, peer);
  }

  /**
   * Start replicating topics.
   *
   * @param {Protocol} protocol
   * @returns {Promise<void>}
   */
  async _handshakeHandler (protocol) {
    const peer = this._peers.get(protocol);

    const context = protocol.getContext();
    const session = protocol.getSession();
    const info = { context, session };

    try {
      const share = feeds => peer.share(feeds);
      const unsubscribe = this._subscribe(share, info);
      peer.on('close', unsubscribe);

      const feeds = await this._load(info) || [];
      await share(feeds);
    } catch (err) {
      console.warn('Load error: ', err);
    }
  }

  /**
   * Handles key exchange requests.
   *
   * @param {Protocol} protocol
   * @param {Object} message
   */
  async _messageHandler (protocol, message) {
    const { type, data } = message;

    try {
      switch (type) {
        case 'share-feeds': {
          await this._replicateHandler(protocol, data || []);
          break;
        }

        default: {
          console.warn(`Invalid type: ${type}`);
        }
      }
    } catch (err) {
      console.warn('Message handler error', err);
    }
  }

  async _replicateHandler (protocol, data) {
    const peer = this._peers.get(protocol);
    const context = protocol.getContext();
    const session = protocol.getSession();
    const info = { context, session };

    try {
      const feeds = await this._replicate(data, info) || [];
      peer.replicate(feeds);
    } catch (err) {
      console.warn('Replicate feeds error', err);
    }
  }

  async _feedHandler (protocol, discoveryKey) {
    await this._replicateHandler(protocol, [{ discoveryKey }]);
  }

  _closeHandler (protocol) {
    const peer = this._peers.get(protocol);
    if (peer) {
      peer.close();
    }
    this._peers.delete(protocol);
  }
}

const noop = () => {};

const middleware = ({ feedStore, onUnsubscribe = noop, onLoad = noop }) => {
  const encodeFeed = (feed, descriptor = {}) => ({
    key: feed.key,
    discoveryKey: feed.discoveryKey,
    metadata: descriptor.metadata && bufferJson.encode(descriptor.metadata)
  });

  const decodeFeed = feed => ({
    key: feed.key,
    discoveryKey: feed.discoveryKey,
    metadata: feed.metadata && bufferJson.decode(feed.metadata)
  });

  return {
    subscribe (next) {
      const onFeed = (feed, descriptor) => next(encodeFeed(feed, descriptor));
      feedStore.on('feed', onFeed);
      return () => {
        onUnsubscribe(feedStore);
        feedStore.removeListener('feed', onFeed);
      };
    },
    async load () {
      const feeds = onLoad(feedStore);
      return feeds.map(feed => encodeFeed(feed, feedStore.getDescriptorByDiscoveryKey(feed.discoveryKey)));
    },
    async replicate (feeds) {
      return Promise.all(feeds.map((feed) => {
        const { key, discoveryKey, metadata } = decodeFeed(feed);

        if (key) {
          const feed = feedStore.getOpenFeed(d => d.key.equals(key));

          if (feed) {
            return feed;
          }

          return feedStore.openFeed(`/remote/${key.toString('hex')}`, { key, metadata });
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
  constructor (opts = {}) {
    super(middleware(opts));
  }
}
