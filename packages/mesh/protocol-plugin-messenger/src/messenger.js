//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { EventEmitter } from 'events';

import { Broadcast } from '@dxos/broadcast';
import { Codec } from '@dxos/codec-protobuf';
import { Extension } from '@dxos/protocol';

/**
 * Peer chat.
 */
export class Messenger extends EventEmitter {
  static EXTENSION_NAME = 'dxos.protocol.messenger';

  // @type {Map<{string, Protocol>}
  _peers = new Map();

  /**
   * @constructor
   * @param {string} peerId
   * @param {Function} peerMessageHandler
   */
  constructor (peerId, peerMessageHandler = () => {}, options = {}) {
    super();

    console.assert(Buffer.isBuffer(peerId));
    console.assert(peerMessageHandler);

    this._peerId = peerId;

    this._onMessage = (protocol, message) => {
      try {
        this.emit('message', message);
        peerMessageHandler(protocol, message);
      } catch (err) {
        // do nothing
      }
    };

    const { ack = false, broadcast = {}, extension = {} } = options;

    this._ack = ack;
    this._broadcastOptions = broadcast;
    this._extensionOptions = extension;

    const middleware = {
      lookup: () => {
        return Array.from(this._peers.values());
      },
      send: async (packet, peer, options) => {
        await this._sendPeerMessage(peer, packet, options);
      },
      subscribe: (onPacket) => {
        this._peerMessageHandler = (protocol, chunk) => {
          const packet = onPacket(chunk.data);

          // Validate if is a broadcast message or not.
          const message = this._codec.decode(packet ? packet.data : chunk.data);

          this._onMessage(protocol, message);
        };
      }
    };

    this._broadcast = new Broadcast(middleware, {
      id: this._peerId,
      ...this._broadcastOptions
    });

    this._codec = new Codec('dxos.protocol.messenger.Message')
      .addJson(require('./proto/schema.json')) // eslint-disable-line @typescript-eslint/no-var-requires
      .build();

    this._broadcast.run();
  }

  get peers () {
    return Array.from(this._peers.values()).map(peer => peer.id);
  }

  /**
   * Create protocol extension.
   * @param {Object} options nanomessage options
   * @return {Extension}
   */
  createExtension (options = {}) {
    return new Extension(Messenger.EXTENSION_NAME, Object.assign({}, this._extensionOptions, options))
      .setInitHandler((protocol) => {
        this._addPeer(protocol);
      })
      .setMessageHandler(this._peerMessageHandler)
      .setCloseHandler((protocol) => {
        this._removePeer(protocol);
      });
  }

  /**
   * Broadcast message to peers.
   * @param {string} type
   * @param {Buffer} payload
   * @param {Object} options @dxos/broadcast options
   * @return {Promise<void>}
   */
  async broadcastMessage (type, payload, options) {
    assert(type);
    assert(Buffer.isBuffer(payload));

    const buffer = this._codec.encode({ type, payload });
    await this._broadcast.publish(buffer, options);
  }

  /**
   * Send message to peer.
   * @param {Buffer} peerId
   * @param {string} type
   * @param {string} payload
   * @return {Promise<void>}
   */
  async sendMessage (peerId, type, payload) {
    assert(peerId);
    assert(type);
    assert(Buffer.isBuffer(payload));

    // Backward compatibility (peerId should always be a Buffer)
    if (typeof peerId === 'string') {
      peerId = Buffer.from(peerId, 'hex');
    }

    const idStr = peerId.toString('hex');

    const peer = this._peers.get(idStr);
    if (!peer) {
      this.emit('peer:not-found', peerId);
      return;
    }

    const buffer = this._codec.encode({ type, payload });
    await this._sendPeerMessage(peer, buffer);
  }

  /**
   * Send message to peer.
   * @param {Object<{id, protocols}>} peer
   * @param {Buffer} buffer
   * @param {Object} options
   * @return {Promise<void>}
   * @private
   */
  async _sendPeerMessage (peer, buffer, options = { ack: this._ack }) {
    return Promise.all(Array.from(peer.protocols.values()).map(protocol => {
      const chat = protocol.getExtension(Messenger.EXTENSION_NAME);
      return chat.send(buffer, { oneway: !options.ack }).catch(() => {});
    }));
  }

  /**
   * Add peer.
   * @param {Protocol} protocol
   * @private
   */
  _addPeer (protocol) {
    const session = protocol.getSession();
    if (!session.peerId) {
      throw new Error('missing peerId');
    }

    const idStr = session.peerId.toString('hex');

    let peer = this._peers.get(idStr);
    if (!peer) {
      peer = { id: session.peerId, protocols: new Set() };
      this._peers.set(idStr, peer);
    }
    peer.protocols.add(protocol);
    this.emit('peer:joined', session.peerId, protocol);
  }

  /**
   * Remove peer.
   * @param {Protocol} protocol
   * @private
   */
  _removePeer (protocol) {
    const session = protocol.getSession();
    if (!session.peerId) {
      return;
    }

    const idStr = session.peerId.toString('hex');

    const peer = this._peers.get(idStr);
    if (!peer) {
      return;
    }

    peer.protocols.delete(protocol);
    if (peer.protocols.size === 0) {
      this._peers.delete(idStr);
    }
    this.emit('peer:left', session.peerId);
  }
}
