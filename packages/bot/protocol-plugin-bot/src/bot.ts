//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { EventEmitter } from 'events';

import { Broadcast, Middleware } from '@dxos/broadcast';
import { Codec } from '@dxos/codec-protobuf';
import { keyToString, keyToBuffer } from '@dxos/crypto';
import { Extension, Protocol } from '@dxos/protocol';

import { schema, Message } from './proto';

const DEFAULT_TIMEOUT = 60000;

/**
 * Bot protocol codec.
 */
export const codec = schema.getCodecForType('dxos.protocol.bot.Message');

interface Peer {
  id: Buffer
  protocol: Protocol
}

/**
 * Bot protocol.
 */
export class BotPlugin extends EventEmitter {
  static EXTENSION_NAME = 'dxos.protocol.bot';

  private readonly _peerId: Buffer;

  private readonly _peers = new Map<string, any /* Protocol */>();

  private readonly _onMessage: (protocol: Protocol, message: Message) => Promise<Uint8Array | undefined>;

  private _commandHandler!: (protocol: Protocol, chunk: { data: Buffer }) => Promise<Uint8Array | undefined>;

  private readonly _codec: Codec<Message>;

  private readonly _broadcast: Broadcast<Peer>;

  /**
   * @constructor
   */
  constructor (peerId: Buffer, commandHandler: (protocol: any, message: Message) => Promise<Message | void> | void = () => {}) {
    super();

    assert(Buffer.isBuffer(peerId));
    assert(commandHandler);

    this._peerId = peerId;

    this._onMessage = async (protocol, message) => {
      try {
        this.emit('message', message);
        const response = await commandHandler(protocol, message);
        if (response) {
          return codec.encode(response);
        }
      } catch (err) {
        // Ignore with console error.
        console.error(err.stack);
      }
    };

    const middleware: Middleware<Peer> = {
      lookup: async () => {
        return Array.from(this._peers.values()).map((peer) => {
          const peerId = peer.getSession();

          return {
            id: peerId,
            protocol: peer
          };
        });
      },
      send: async (packet, peer) => {
        await peer.protocol.getExtension(BotPlugin.EXTENSION_NAME)!.send(packet);
      },
      subscribe: (onPacket) => {
        this._commandHandler = (protocol, chunk) => {
          const packet = onPacket(chunk.data);

          // Validate if is a broadcast message or not.
          const message = this._codec.decode(packet?.data ?? chunk.data);

          return this._onMessage(protocol, message);
        };
      }
    };

    this._broadcast = new Broadcast(middleware, {
      id: this._peerId
    });

    this._codec = codec;
  }

  get peers () {
    return Array.from(this._peers.keys()).map(id => keyToBuffer(id));
  }

  /**
   * Create protocol extension.
   * @return {Extension}
   */
  createExtension (timeout = DEFAULT_TIMEOUT) {
    this._broadcast.open();

    return new Extension(BotPlugin.EXTENSION_NAME, { timeout })
      .setInitHandler(async protocol => {
        this._addPeer(protocol);
      })
      .setHandshakeHandler(async protocol => {
        const peerId = protocol.getSession();

        if (this._peers.has(keyToString(peerId))) {
          this.emit('peer:joined', peerId, protocol);
        }
      })
      .setMessageHandler(this._commandHandler)
      .setCloseHandler(async protocol => {
        this._removePeer(protocol);
      });
  }

  /**
   * Broadcast command to peers.
   */
  async broadcastCommand (command: Message) {
    assert(command);

    const buffer = this._codec.encode(command);
    await this._broadcast.publish(buffer);
  }

  /**
   * Send command to peer.
   */
  async sendCommand (peerId: Buffer, command: Message, oneway = false): Promise<Message | undefined> {
    assert(peerId);
    assert(command);
    assert(Buffer.isBuffer(peerId));

    const peer = this._peers.get(keyToString(peerId));
    if (!peer) {
      this.emit('peer:not-found', peerId);
      return;
    }

    const buffer = this._codec.encode(command);
    const result = await peer.getExtension(BotPlugin.EXTENSION_NAME).send(buffer, { oneway });

    let response;
    if (!oneway && result.response && Buffer.isBuffer(result.response.data)) {
      response = codec.decode(result.response.data);
    }

    return response;
  }

  /**
   * Add peer.
   */
  private _addPeer (protocol: Protocol) {
    const peerId = protocol.getSession();
    if (this._peers.has(keyToString(peerId))) {
      return;
    }

    this._peers.set(keyToString(peerId), protocol);
  }

  /**
   * Remove peer.
   */
  private _removePeer (protocol: Protocol) {
    assert(protocol);

    const peerId = protocol.getSession();
    if (!peerId) {
      return;
    }

    this._peers.delete(keyToString(peerId));
    this.emit('peer:exited', peerId);
  }
}
