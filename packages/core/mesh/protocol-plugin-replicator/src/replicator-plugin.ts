//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { FeedWrapper } from '@dxos/feed-store';
import { PublicKeyLike } from '@dxos/keys';
import { Extension, Protocol } from '@dxos/mesh-protocol';
import { schemaJson } from '@dxos/protocols';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import type { Feed as FeedData } from '@dxos/protocols/proto/dxos/mesh/replicator';

import { Peer } from './peer';

const log = debug('dxos:protocol-plugin-replicator');

export type ReplicatorContextInfo = {
  /**
   * Passed from protocol.getContext()
   */
  context: any

  /**
   * Peer id, loaded from protocol.getSession()
   */
  session?: string
}

type LoadFunction = (info: ReplicatorContextInfo) => Promise<FeedData[]>;

type SubscribeFunction = (share: (feeds: FeedData[]) => Promise<void> | undefined, info: ReplicatorContextInfo) => () => void;

type ReplicateFunction = (feeds: FeedData[], info: ReplicatorContextInfo) => Promise<FeedWrapper<FeedMessage>[]>;

const defaultSubscribe: SubscribeFunction = () => () => {};
const defaultReplicate: ReplicateFunction = async () => [];

export type ReplicatorMiddleware = {
  /**
   * Returns a list of local feeds to replicate.
   */
  load: LoadFunction

  /**
   * Subscribe to new local feeds being opened.
   */
  subscribe?: SubscribeFunction

  /**
   * Maps feed replication requests to a set of feed descriptors to be replicated.
   */
  replicate?: ReplicateFunction
}

/**
 * Manages key exchange and feed replication.
 */
export class ReplicatorPlugin {
  static readonly EXTENSION = 'dxos.mesh.protocol.replicator';

  private readonly _peers = new Map<Protocol, Peer>();
  private readonly _options: { timeout: number };
  private readonly _load: LoadFunction;
  private readonly _subscribe: SubscribeFunction;
  private readonly _replicate: ReplicateFunction;

  constructor ({
    load,
    subscribe,
    replicate
  }: ReplicatorMiddleware, options?: { timeout: number }) {
    this._options = options ?? { timeout: 10000 };
    this._load = load;
    this._subscribe = subscribe ?? defaultSubscribe;
    this._replicate = replicate ?? defaultReplicate;
  }

  /**
   * Creates a protocol extension for key exchange.
   * @return {Extension}
   */
  createExtension () {
    return new Extension(ReplicatorPlugin.EXTENSION, { schema: schemaJson, timeout: this._options.timeout })
      .setInitHandler(this._initHandler.bind(this))
      .setHandshakeHandler(this._handshakeHandler.bind(this))
      .setMessageHandler(this._messageHandler.bind(this))
      .setCloseHandler(this._closeHandler.bind(this))
      .setFeedHandler(this._feedHandler.bind(this));
  }

  async _initHandler (protocol: Protocol) {
    const extension = protocol.getExtension(ReplicatorPlugin.EXTENSION);
    assert(extension, `Missing '${ReplicatorPlugin.EXTENSION}' extension in protocol.`);

    const peer = new Peer(protocol, extension);
    this._peers.set(protocol, peer);
  }

  /**
   * Start replicating topics.
   * @param {Protocol} protocol
   * @returns {Promise<void>}
   */
  async _handshakeHandler (protocol: Protocol) {
    const peer = this._peers.get(protocol);
    const context = protocol.getContext();
    const { peerId: session } = protocol.getSession() ?? {};
    const info = { context, session };

    try {
      const share = async (feeds: FeedData[]) => {
        try {
          await peer?.share(feeds);
          // Necessary to avoid deadlocks.
          await this._replicateHandler(protocol, []);
        } catch (err) {
          log(err);
        }
      };

      const unsubscribe = this._subscribe(share, info);
      peer?.closed.on(unsubscribe);

      const feeds = (await this._load(info)) || [];
      await share(feeds);

      // Necessary to avoid deadlocks.
      await this._replicateHandler(protocol, []);
    } catch (err: any) {
      console.warn('Load error: ', err);
    }
  }

  /**
   * Handles key exchange requests.
   */
  async _messageHandler (protocol: Protocol, message: any) {
    try {
      const { type, data } = message; // TODO(burdon): Type?
      switch (type) {
        case 'share-feeds': { // TODO(burdon): Const/enum.
          await this._replicateHandler(protocol, data || []);
          break;
        }

        default: {
          console.warn(`Invalid type: ${type}`);
        }
      }
    } catch (err: any) {
      console.warn('Message handler error', err);
    }
  }

  async _replicateHandler (protocol: Protocol, data: any) {
    const peer = this._peers.get(protocol);
    const context = protocol.getContext();
    const { peerId: session } = protocol.getSession() ?? {};
    assert(typeof session === 'string');

    try {
      const info = { context, session };
      const feeds = await this._replicate(data, info);
      peer?.replicate(feeds ?? []);
    } catch (err: any) {
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
