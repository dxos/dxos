//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { EventEmitter } from 'events';

import { PublicKeyLike } from '@dxos/crypto';
import { Extension, Protocol } from '@dxos/protocol';

import { Peer } from './peer';
import { schemaJson } from './proto/gen';
import { Feed } from './proto/gen/dxos/protocol/replicator';

// const log = debug('dxos.replicator');

const defaultReplicate = () => {};
const defaultSubscribe = () => () => {};

/**
 * Manages key exchange and feed replication.
 */
// TODO(burdon): Rename ReplicatorPlugin.
export class Replicator extends EventEmitter {
  static extension = 'dxos.protocol.replicator';
  private readonly _peers = new Map<Protocol, Peer>();
  private _options: {timeout: number}
  private _load: (...args: any[]) => any;
  private _subscribe: (...args: any[]) => any;
  private _replicate: (...args: any[]) => any;

  constructor (middleware: any, options?: {timeout?: number}) {
    super();
    assert(middleware);
    assert(middleware.load);

    const { load, subscribe = defaultSubscribe, replicate = defaultReplicate } = middleware;

    this._load = async (...args) => load(...args);
    this._subscribe = (...args) => subscribe(...args);
    this._replicate = async (...args) => replicate(...args);

    this._options = Object.assign({
      timeout: 1000
    }, options);
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
      schema: schemaJson,
      timeout: this._options.timeout
    })
      .on('error', (err: any) => this.emit(err))
      .setInitHandler(this._initHandler.bind(this))
      .setHandshakeHandler(this._handshakeHandler.bind(this))
      .setMessageHandler(this._messageHandler.bind(this))
      .setCloseHandler(this._closeHandler.bind(this))
      .setFeedHandler(this._feedHandler.bind(this));
  }

  async _initHandler (protocol: Protocol) {
    const extension = protocol.getExtension(Replicator.extension);
    assert(extension, `Missing '${Replicator.extension}' extension in protocol.`);

    const peer = new Peer(protocol, extension);

    this._peers.set(protocol, peer);
  }

  /**
   * Start replicating topics.
   *
   * @param {Protocol} protocol
   * @returns {Promise<void>}
   */
  async _handshakeHandler (protocol: Protocol) {
    const peer = this._peers.get(protocol);

    const context = protocol.getContext();
    const session = protocol.getSession();
    const info = { context, session };

    try {
      const share = (feeds: Feed[]) => peer?.share(feeds);
      const unsubscribe = this._subscribe(share, info);
      peer?.closed.on(unsubscribe);

      const feeds = await this._load(info) || [];
      await share(feeds);
    } catch (err) {
      console.warn('Load error: ', err);
    }
  }

  /**
   * Handles key exchange requests.
   *
   */
  async _messageHandler (protocol: Protocol, message: any) {
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

  async _replicateHandler (protocol: Protocol, data: any) {
    const peer = this._peers.get(protocol);
    const context = protocol.getContext();
    const session = protocol.getSession();
    const info = { context, session };

    try {
      const feeds = await this._replicate(data, info) || [];
      peer?.replicate(feeds);
    } catch (err) {
      console.warn('Replicate feeds error', err);
    }
  }

  async _feedHandler (protocol: Protocol, discoveryKey: PublicKeyLike) {
    await this._replicateHandler(protocol, [{ discoveryKey }]);
  }

  _closeHandler (protocol: Protocol) {
    const peer = this._peers.get(protocol);
    peer?.close();
    this._peers.delete(protocol);
  }
}
