//
// Copyright 2020 DXOS.org
//

// Test/mock Protocol implementation used in network-manager tests.

import assert from 'assert';
import debug from 'debug';
import { EventEmitter } from 'events';

import { keyToString } from '@dxos/crypto';
import { Extension } from '@dxos/protocol';

import { protocolFactory } from '../protocol-factory';

const log = debug('dxos:network-manager:test');

const EXTENSION_NAME = 'test';

// TODO(dboreham): This method should be added to Protocol (and one for "my ID"?).
export const getPeerId = (protocol) => {
  const { peerId } = protocol && protocol.getSession ? protocol.getSession() : {};
  return peerId;
};

/**
 * Object Implementing a p2p protocol (interaction across a set of peers using a common protocol)
 * and an associated transport connection protocol (interaction with each individual peer over a single network
 * transport connection).
 */
export class TestProtocolPlugin extends EventEmitter {
  /** @type {Map<string, {Protocol}>} */
  _peers;

  /** @type {Buffer} */
  _peerId;

  /** @type {Boolean} */
  _uppercase;

  /**
   * Test Protocol. Passes through messages unchanged, or folds to upper case.
   * Provides a way to test that two protocols with different behavior are
   * indeed being used with two different swarm keys.
   * @param {Buffer} peerId
   * @param {Boolean} uppercase Fold payload case to upper if set.
   */
  constructor (peerId, uppercase = false) {
    assert(Buffer.isBuffer(peerId));
    super();

    // TODO(dboreham): Mis-named because this is OUR node ID, not the id of any peer.
    this._peerId = peerId;
    if (this._peerId === undefined) {
      throw new Error('Peer id must be defined');
    }
    this._uppercase = uppercase;
    this._peers = new Map();
  }

  /**
   * This node's id.
   * @return {Buffer}
   */
  get peerId () {
    return this._peerId;
  }

  /**
   * Array of the currently connected peers' node ids (not including our id).
   * @return {{Protocol}[]}
   */
  get peers () {
    return Array.from(this._peers.values());
  }

  /**
   * Factory function for Extensions (per-connection object).
   * Called when a new peer transport connection is established.
   * @return {Extension}
   */
  createExtension () {
    return new Extension(EXTENSION_NAME, { binary: true })
      .setMessageHandler(this._receive.bind(this))
      .setHandshakeHandler(this._onPeerConnect.bind(this))
      .setCloseHandler(this._onPeerDisconnect.bind(this));
  }

  // Methods below are per-peer-connection.
  // TODO(dboreham): Why are these here and not on Protocol?

  /**
   * Send/Receive messages with peer when initiating a request/response interaction.
   * @param peerId {Buffer} Must be the value passed to the constructor on the responding node.
   * @param payload {string} Message to send
   * @return {string} Message received from peer in response to our request.
   */
  async send (peerId, payload) {
    assert(Buffer.isBuffer(peerId));
    const peerIdStr = keyToString(peerId);
    const peer = this._peers.get(peerIdStr);
    // TODO(dboreham): Throw fatal error if peer not found.
    const extension = peer.getExtension(EXTENSION_NAME);
    const encoded = Buffer.from(payload);
    await extension.send(encoded, { oneway: true });
    log('Sent to %s: %s', peerIdStr, payload);
  }

  async _receive (protocol, data) {
    const peerIdStr = keyToString(getPeerId(protocol));
    let payload = data.data.toString();
    if (this._uppercase) {
      payload = payload.toUpperCase();
    }
    log('Received from %s: %s', peerIdStr, payload);
    this.emit('receive', protocol, payload);
  }

  _onPeerConnect (protocol) {
    const peerId = getPeerId(protocol);
    if (peerId === undefined) {
      return;
    }
    const peerIdStr = keyToString(peerId);
    if (this._peers.has(peerIdStr)) {
      return;
    }

    this._peers.set(peerIdStr, protocol);
    this.emit('connect', protocol);
  }

  _onPeerDisconnect (protocol) {
    const peerId = getPeerId(protocol);
    if (peerId === undefined) {
      return;
    }

    this._peers.delete(keyToString(peerId));
    this.emit('disconnect', peerId);
  }
}

/**
 * @return {ProtocolProvider}
 */
// TODO(dboreham): Try to encapsulate swarmKey, nodeId.
export const testProtocolProvider = (swarmKey, nodeId, protocolPlugin) => {
  return protocolFactory({
    getTopics: () => {
      return [swarmKey];
    },
    session: { peerId: nodeId },
    plugins: [protocolPlugin]
  });
};
