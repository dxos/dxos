//
// Copyright 2020 DXOS.org
//

/**
 * TODO(dboreham): This class is not specific to Greeting (apart from the codec chosen) and so should be renamed
 *   and moved somewhere more abstract (RpcProtocolPlugin?).
 */

import debug from 'debug';
import { EventEmitter } from 'events';
import assert from 'node:assert';

import { WithTypeUrl } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { Extension, ERR_EXTENSION_RESPONSE_FAILED, Protocol } from '@dxos/mesh-protocol';
import { Command } from '@dxos/protocols/proto/dxos/halo/credentials/greet';

import { wrapMessage } from '../party';
import { codec } from '../proto';
import { PeerId } from '../typedefs';
import { ERR_GREET_GENERAL } from './error-codes';

const log = debug('dxos:halo:greet:plugin'); // eslint-disable-line unused-imports/no-unused-vars

const DEFAULT_TIMEOUT = 30000;

export type GreetingCommandMessageHandler = (message: any, remotePeerId: Buffer, peerId: Buffer) => Promise<any>;

const getPeerId = (protocol: Protocol) => {
  const { peerId } = protocol.getSession() ?? {};
  return PublicKey.bufferize(peerId);
};

/**
 * A Protocol plugin. Implements a simple request/response protocol.
 * The requesting node calls send() with a request message. Responding node
 * calls its peerMessageHandler. The return value from peerMessageHandler
 * is the response message, sent to the requesting node, and is the return
 * value from the original call to send().
 * Encode/decode is done inside the plugin using codec.
 *
 * TODO(dboreham): What happens on errors and timeouts?
 * @param peerId {Buffer} Unique key. On a responding node, this value must be communicated OOB to any requesting node.
 * @param peerMessageHandler {function({Buffer}):Buffer} Async receive/send callback. Only used on responding nodes.
 * @event GreetingCommandPlugin#'peer:joined' - Peer joined swarm
 * @event GreetingCommandPlugin#'peer:exited' - Peer exits swarm
 */
// TODO(burdon): Rename GreetingPlugin.
export class GreetingCommandPlugin extends EventEmitter {
  public static EXTENSION_NAME = 'dxos.halo.credentials.greeting';

  _peerId: Buffer;
  _peerMessageHandler: GreetingCommandMessageHandler;
  _peers: Map<string, any>;

  constructor (peerId: Buffer, peerMessageHandler: GreetingCommandMessageHandler) {
    super();
    assert(Buffer.isBuffer(peerId));
    assert(peerMessageHandler);

    this._peerId = peerId;
    this._peerMessageHandler = peerMessageHandler;

    /**
     * A map of Protocol objects indexed by the stringified peerId.
     * @type {Map<string, any>}
     * @private
     */
    this._peers = new Map<string, any>();
  }

  get peerId () {
    return this._peerId;
  }

  get peers () {
    return Array.from(this._peers.values());
  }

  /**
   * Create protocol extension.
   * @return {Extension}
   */
  createExtension (timeout = DEFAULT_TIMEOUT) {
    return new Extension(GreetingCommandPlugin.EXTENSION_NAME, { binary: true, timeout })
      .setMessageHandler(this._receive.bind(this))
      .setHandshakeHandler(this._addPeer.bind(this))
      .setCloseHandler(this._removePeer.bind(this));
  }

  /**
   * Send/Receive messages with peer when initiating a request/response interaction.
   * @param {Buffer} peerId Must be the value passed to the constructor on the responding node.
   * @param {Command} message Message to send, request message in a request/response interaction with peer.
   * @return {Object} Message received from peer in response to our request.
   */
  async send (peerId: PeerId, message: WithTypeUrl<Command>, oneway = false) {
    assert(Buffer.isBuffer(peerId), 'peerId is not a buffer.');
    assert(message);
    return this._send(peerId, message, oneway);
  }

  /**
   * Sends `payload` to `peerId` as a protocol-extension message, optionally waiting for a response.
   * If the Command expects a response (oneway === false) then it will be returned.
   * If oneway === true, no response is returned.
   * @param {PeerId} peerId The peer to send the Command to.
   * @param {Command} message The Greeting Command message.
   * @param {boolean} oneway Whether the command expects a response.
   * @returns {Promise<object|void>}
   * @private
   */
  async _send (peerId: PeerId, message: Command, oneway: boolean) {
    assert(Buffer.isBuffer(peerId));
    // `peerId` is a Buffer, but here we only need its string form.
    const peerIdStr = PublicKey.stringify(peerId);
    const peer = this._peers.get(peerIdStr);
    assert(peer, `Peer not connected: ${peerIdStr}`);
    const extension = peer.getExtension(GreetingCommandPlugin.EXTENSION_NAME);

    log('Sent request to %s: %o', peerIdStr, message);

    const encoded = codec.encode(wrapMessage(message));

    if (oneway) {
      await extension.send(encoded, { oneway });
      return;
    }

    let result;
    try {
      result = await extension.send(encoded, { oneway });
    } catch (err: any) {
      // TODO(dboreham): Temporary work around for `https://github.com/dxos/protocol/issues/12`.
      if (!(err instanceof Error)) {
        if (err.code) {
          throw new Error(err.code);
        } else {
          log('Unknown error:', err);
          throw new Error('Unknown error');
        }
      } else {
        throw err;
      }
    }

    assert(result.response.data, 'Response data is missing.');
    const response = Buffer.isBuffer(result.response.data) ? result.response.data : Buffer.from(result.response.data);
    result.response = codec.decode(response);

    log('Received response from %s: %o', peerIdStr, result.response.payload);

    return result.response.payload;
  }

  /**
   * Receives a message from a remote peer.
   * @param {any} protocol
   * @param {object} data
   * @returns {Promise<Buffer>}
   * @private
   */
  async _receive (protocol: any, data: any) {
    if (!this._peerMessageHandler) {
      throw new ERR_EXTENSION_RESPONSE_FAILED(GreetingCommandPlugin.EXTENSION_NAME, ERR_GREET_GENERAL, 'Missing message handler.');
    }

    const peerId = getPeerId(protocol);
    assert(Buffer.isBuffer(peerId), 'peerId missing');
    const peerIdStr = peerId.toString('hex');
    const decoded = codec.decode(data.data);

    log('Received request from %s: %o', peerIdStr, decoded.payload);

    const response = await this._peerMessageHandler(decoded.payload, peerId, this._peerId);
    if (response) {
      log('Sent response to %s: %o', peerIdStr, response.payload);
      return codec.encode(wrapMessage(response));
    }
    log('No response to %s', peerIdStr);
  }

  async _addPeer (protocol: Protocol) {
    const peerId = getPeerId(protocol);
    assert(Buffer.isBuffer(peerId), 'peerId missing');
    const peerIdStr = peerId.toString('hex');
    if (this._peers.has(peerIdStr)) {
      return;
    }

    this._peers.set(peerIdStr, protocol);
    log('peer:joined', peerIdStr);
    this.emit('peer:joined', peerId);
  }

  async _removePeer (protocol: Protocol) {
    const peerId = getPeerId(protocol);

    if (peerId) {
      assert(Buffer.isBuffer(peerId), 'peerId is not a Buffer');
      const peerIdStr = peerId.toString('hex');
      this._peers.delete(peerIdStr);
      log('peer:exited', peerIdStr);
      this.emit('peer:exited', peerId);
    } else {
      log('WARN: peer:exited, but no peerId available.', protocol);
    }
  }
}
