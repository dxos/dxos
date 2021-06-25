//
// Copyright 2020 DXOS.org
//

// Test/mock Protocol implementation used in network-manager tests.

import assert from 'assert';
import debug from 'debug';
import { EventEmitter } from 'events';

import { keyToBuffer, keyToString } from '@dxos/crypto';
import { Extension, Protocol } from '@dxos/protocol';

import { protocolFactory } from '../protocol-factory';

const log = debug('dxos:network-manager:test');

const EXTENSION_NAME = 'test';

// TODO(dboreham): This method should be added to Protocol (and one for "my ID"?).
export const getPeerId = (protocol: Protocol) => {
  const { peerId } = protocol.getSession() ?? {};
  return keyToBuffer(peerId);
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
  constructor (peerId: Buffer, uppercase = false) {
    assert(Buffer.isBuffer(peerId));
    super();

    // TODO(dboreham): Mis-named because this is OUR node ID, not the id of any peer.
    this._peerId = peerId;
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
   * @param peerId Must be the value passed to the constructor on the responding node.
   * @param payload Message to send
   * @return Message received from peer in response to our request.
   */
  async send (peerId: Buffer, payload: string): Promise<string> {
    assert(Buffer.isBuffer(peerId));
    const peerIdStr = keyToString(peerId);
    const peer = this._peers.get(peerIdStr);
    // TODO(dboreham): Throw fatal error if peer not found.
    const extension = peer.getExtension(EXTENSION_NAME);
    const encoded = Buffer.from(payload);
    log('Sent to %s: %s', peerIdStr, payload);
    return await extension.send(encoded, { oneway: true });
  }

  async _receive (protocol: Protocol, data: any) {
    const peerIdStr = keyToString(getPeerId(protocol));
    let payload = data.data.toString();
    if (this._uppercase) {
      payload = payload.toUpperCase();
    }
    log('Received from %s: %s', peerIdStr, payload);
    this.emit('receive', protocol, payload);
  }

  async _onPeerConnect (protocol: Protocol) {
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

  async _onPeerDisconnect (protocol: Protocol) {
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
export const testProtocolProvider = (swarmKey: Buffer, nodeId: Buffer, protocolPlugin: any) => {
  return protocolFactory({
    getTopics: () => {
      return [swarmKey];
    },
    session: { peerId: keyToString(nodeId) },
    plugins: [protocolPlugin]
  });
};
