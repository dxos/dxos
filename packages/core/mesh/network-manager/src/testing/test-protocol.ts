//
// Copyright 2020 DXOS.org
//

// Test/mock Protocol implementation used in network-manager tests.

import { EventEmitter } from 'events';
import assert from 'node:assert';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Extension, Protocol } from '@dxos/mesh-protocol';

import { protocolFactory } from '../protocol-factory';

const EXTENSION_NAME = 'test';

// TODO(burdon): PublicKey.
// TODO(dboreham): This method should be added to Protocol (and one for "my ID"?).
export const getPeerId = (protocol: Protocol) => {
  const { peerId } = protocol.getSession() ?? {};
  if (!peerId) {
    return undefined;
  }

  return PublicKey.bufferize(peerId);
};

/**
 * @deprecated
 */
// TODO(burdon): Reconcile with transportProtocolProvider.
export const testProtocolProvider = (topic: Buffer, peerId: PublicKey, protocolPlugin: any) => {
  log('creating protocol-factory', { topic: PublicKey.from(topic), peerId });

  return protocolFactory({
    getTopics: () => [topic],
    session: { peerId: peerId.toHex() }, // TODO(burdon): PublicKey.
    plugins: [protocolPlugin]
  });
};

/**
 * Object Implementing a p2p protocol (interaction across a set of peers using a common protocol)
 * and an associated transport connection protocol (interaction with each individual peer over a single network
 * transport connection).
 */
export class TestProtocolPlugin extends EventEmitter {
  /** @type {Map<string, {Protocol}>} */
  private readonly _peers = new Map(); // TODO(burdon): Complex map.

  /** @type {Buffer} */
  _peerId; // TODO(burdon): PublicKey.

  /** @type {Boolean} */
  _uppercase;

  initCalled = false;

  /**
   * Test Protocol. Passes through messages unchanged, or folds to upper case.
   * Provides a way to test that two protocols with different behavior are
   * indeed being used with two different swarm keys.
   * @param {Buffer} peerId
   * @param {Boolean} uppercase Fold payload case to upper if set.
   */
  constructor(peerId: Buffer, uppercase = false) {
    super();
    assert(Buffer.isBuffer(peerId));

    // TODO(dboreham): Mis-named because this is OUR node ID, not the id of any peer.
    this._peerId = peerId;
    this._uppercase = uppercase;
  }

  // TODO(burdon): Expose key directly.
  get peerId() {
    return this._peerId;
  }

  // TODO(burdon): Map of keys.
  get peers() {
    return Array.from(this._peers.values());
  }

  /**
   * Factory function for Extensions (per-connection object).
   * Called when a new peer transport connection is established.
   * @return {Extension}
   */
  createExtension() {
    log('creating extension', { peerId: PublicKey.from(this.peerId) }); // TODO(burdon): Just key.
    return new Extension(EXTENSION_NAME, { binary: true })
      .setInitHandler(this._init.bind(this))
      .setMessageHandler(this._receive.bind(this))
      .setHandshakeHandler(this._onPeerConnect.bind(this))
      .setCloseHandler(this._onPeerDisconnect.bind(this));
  }

  // Methods below are per-peer connection.
  // TODO(dboreham): Why are these here and not on Protocol?

  private async _init(protocol: Protocol) {
    this.initCalled = true;
  }

  /**
   * Send/Receive messages with peer when initiating a request/response interaction.
   * @param peerId Must be the value passed to the constructor on the responding node.
   * @param payload Message to send
   * @return Message received from peer in response to our request.
   */
  async send(peerId: Buffer, payload: string): Promise<string> {
    assert(Buffer.isBuffer(peerId));
    const peerIdStr = PublicKey.stringify(peerId); // TODO(burdon): PublicKey.
    const peer = this._peers.get(peerIdStr);
    if (!peer) {
      throw new Error(`peer not found: ${PublicKey.from(peerId).truncate()}`);
    }

    const extension = peer.getExtension(EXTENSION_NAME);
    const encoded = Buffer.from(payload);

    log('sending', { peerId: PublicKey.from(peerId), payload });
    return await extension.send(encoded, { oneway: true });
  }

  async _receive(protocol: Protocol, data: any) {
    const peerId = getPeerId(protocol);
    assert(peerId !== undefined);
    let payload = data.data.toString();
    if (this._uppercase) {
      payload = payload.toUpperCase();
    }

    log('received', { peerId: PublicKey.from(peerId), payload });
    this.emit('receive', protocol, payload);
  }

  async _onPeerConnect(protocol: Protocol) {
    log('connecting', { id: PublicKey.from(protocol.id) });
    const peerId = getPeerId(protocol);
    if (peerId === undefined) {
      return;
    }

    const peerIdStr = PublicKey.stringify(peerId);
    if (this._peers.has(peerIdStr)) {
      return;
    }

    this._peers.set(peerIdStr, protocol);
    this.emit('connect', protocol);
  }

  async _onPeerDisconnect(protocol: Protocol) {
    log('disconnecting', { id: PublicKey.from(protocol.id) });
    const peerId = getPeerId(protocol);
    if (peerId === undefined) {
      return;
    }

    this._peers.delete(PublicKey.stringify(peerId));
    this.emit('disconnect', peerId);
  }
}
