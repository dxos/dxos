//
// Copyright 2020 DXOS.org
//

import { StreamExtension } from 'hypercore-protocol';
import { Nanomessage, errors as nanomessageErrors } from 'nanomessage';
import assert from 'node:assert';

import { patchBufferCodec, Codec, WithTypeUrl } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';

import {
  ERR_PROTOCOL_STREAM_CLOSED,
  ERR_EXTENSION_INIT_FAILED,
  ERR_EXTENSION_HANDSHAKE_FAILED,
  ERR_EXTENSION_FEED_FAILED,
  ERR_EXTENSION_CLOSE_FAILED,
  ERR_EXTENSION_RESPONSE_FAILED,
  ERR_EXTENSION_RESPONSE_TIMEOUT
} from './errors';
import { Protocol } from './protocol';

const { NMSG_ERR_TIMEOUT } = nanomessageErrors;

const kCodec = Symbol('nanomessage.codec');

export interface ExtensionOptions {
  /**
   * Protobuf schema json.
   */
  schema?: Record<string, any>;

  [key: string]: any;
}

export type InitHandler = (protocol: Protocol) => Promise<void> | void;
export type HandshakeHandler = (protocol: Protocol) => Promise<void> | void;
export type CloseHandler = (protocol: Protocol) => Promise<void> | void;
export type MessageHandler = (protocol: Protocol, message: any) => Promise<any> | void;
export type FeedHandler = (protocol: Protocol, discoveryKey: Buffer) => Promise<void> | void;

/**
 * Reliable message passing via using Dat protocol extensions.
 * Events: "send", "receive", "error"
 */
// TODO(burdon): Rename ProtocolPlugin to disambiguate ProtocolExtension.
export class Extension extends Nanomessage {
  public _name: any;

  public [kCodec]: Codec<any>;

  public stats: any;

  private _protocol: Protocol | null = null;
  private _protocolExtension: StreamExtension | null = null;
  private _initHandler: InitHandler | null = null;

  /**
   * Handshake handler.
   */
  private _handshakeHandler: HandshakeHandler | null = null;

  /**
   * Close handler.
   */
  private _closeHandler: CloseHandler | null = null;

  /**
   * Message handler.
   * @type {Function<{protocol, message}>}
   */
  private _messageHandler: MessageHandler | null = null;

  /**
   * Feed handler.
   */
  private _feedHandler: FeedHandler | null = null;

  private _subscribeCb: ((data: any) => void) | null = null;

  /**
   * @param {string} name
   * @param {Object} options
   * @param {Number} options.timeout
   */
  constructor(name: string, { schema: userSchema, ...nmOptions }: ExtensionOptions = {}) {
    super(nmOptions);
    assert(name.length > 0, 'name is required.');
    this._name = name;

    const codec = schema.getCodecForType('dxos.mesh.protocol.Message');
    if (userSchema) {
      codec.addJson(userSchema);
    }

    this[kCodec] = patchBufferCodec(codec);

    this.on('error', (err) => log.warn(err));
  }

  get name() {
    return this._name;
  }

  setInitHandler(initHandler: InitHandler) {
    this._initHandler = initHandler;
    return this;
  }

  /**
   * Sets the handshake handler.
   * @param {Function<{protocol}>} handshakeHandler - Async handshake handler.
   * @returns {Extension}
   */
  setHandshakeHandler(handshakeHandler: HandshakeHandler) {
    this._handshakeHandler = handshakeHandler;
    return this;
  }

  /**
   * Sets the close stream handler.
   * @param {Function<{protocol}>} closeHandler - Close handler.
   * @returns {Extension}
   */
  setCloseHandler(closeHandler: CloseHandler) {
    this._closeHandler = closeHandler;
    return this;
  }

  /**
   * Sets the message handler.
   * @param {Function<{protocol, message}>} messageHandler - Async message handler.
   * @returns {Extension}
   */
  setMessageHandler(messageHandler: MessageHandler) {
    this._messageHandler = messageHandler;
    return this;
  }

  /**
   * Sets the message handler.
   * @param {Function<{protocol, discovery_key}>} feedHandler - Async feed handler.
   * @returns {Extension}
   */
  setFeedHandler(feedHandler: FeedHandler) {
    this._feedHandler = feedHandler;
    return this;
  }

  /**
   * Initializes the extension.
   */
  async openWithProtocol(protocol: Protocol) {
    assert(!this._protocol); // TODO(burdon): Flaky in tests.
    log('open', { name: this._name, id: PublicKey.from(protocol.id) });

    this._protocol = protocol;
    this._protocolExtension = this._protocol.stream.registerExtension(this.name, {
      onmessage: async (msg: any) => {
        try {
          await this._subscribeCb?.(msg);
        } catch (err: any) {
          log.error('failed to execute subscribe callback on message', {
            name: this._name,
            id: PublicKey.from(protocol.id)
          });
        }
      }
    });

    await this.open();
  }

  async onInit() {
    try {
      await this.open();
      assert(this._protocol);
      if (this._protocol.stream.destroyed) {
        throw new ERR_PROTOCOL_STREAM_CLOSED();
      }

      if (this._initHandler) {
        await this._initHandler(this._protocol);
      }
    } catch (err: any) {
      throw ERR_EXTENSION_INIT_FAILED.from(err);
    }
  }

  /**
   * Handshake event.
   */
  async onHandshake() {
    try {
      await this.open();
      assert(this._protocol);
      if (this._protocol.stream.destroyed) {
        throw new ERR_PROTOCOL_STREAM_CLOSED();
        // this.emit('error', new ERR_PROTOCOL_STREAM_CLOSED());
        // return await this.close();
      }

      if (this._handshakeHandler) {
        await this._handshakeHandler(this._protocol);
      }
    } catch (err: any) {
      throw ERR_EXTENSION_HANDSHAKE_FAILED.from(err);
    }
  }

  /**
   * Feed event.
   */
  async onFeed(discoveryKey: Buffer) {
    try {
      await this.open();
      assert(this._protocol);
      if (this._protocol.stream.destroyed) {
        throw new ERR_PROTOCOL_STREAM_CLOSED();
      }

      if (this._feedHandler) {
        await this._feedHandler(this._protocol, discoveryKey);
      }
    } catch (err: any) {
      throw ERR_EXTENSION_FEED_FAILED.from(err);
    }
  }

  //
  // Nanomesssage interface.
  //

  /**
   * Sends a message to peer.
   * @param {(Object|Buffer)} message
   * @param {Object} options
   * @param {Boolean} options.oneway
   * @returns {Promise<Object>} Response from peer.
   */
  override async send(message: Buffer | Uint8Array | WithTypeUrl<object>, options: { oneway?: boolean } = {}) {
    assert(this._protocol);
    if (this._protocol.stream.destroyed) {
      throw new ERR_PROTOCOL_STREAM_CLOSED();
    }

    const builtMessage = buildMessage(message);
    if (options.oneway) {
      return super.send(builtMessage);
    }

    try {
      const response = await this.request(builtMessage);
      if (response && response.code && response.message) {
        throw new ERR_EXTENSION_RESPONSE_FAILED(this._name, response.code, response.message);
      }

      return { response };
    } catch (err: any) {
      if (this.closing) {
        // Ignore error if closing.
        return;
      }

      if (ERR_EXTENSION_RESPONSE_FAILED.equals(err)) {
        throw err;
      } else if (NMSG_ERR_TIMEOUT.equals(err)) {
        throw ERR_EXTENSION_RESPONSE_TIMEOUT.from(err);
      } else {
        throw new ERR_EXTENSION_RESPONSE_FAILED(this._name, err.code || 'Error', err.message);
      }
    }
  }

  override _subscribe(next: (msg: any) => Promise<void>) {
    this._subscribeCb = next;
  }

  override async _open() {
    assert(this._protocol);
    if (this._protocol.stream.destroyed) {
      throw new ERR_PROTOCOL_STREAM_CLOSED();
    }

    assert(this._protocol);
    await super._open();
  }

  override async _close() {
    try {
      await super._close();
      if (this._closeHandler) {
        assert(this._protocol);
        await this._closeHandler(this._protocol);
      }
    } catch (err: any) {
      throw ERR_EXTENSION_CLOSE_FAILED.from(err);
    }
  }

  override async _send(msg: Buffer) {
    assert(this._protocol);
    assert(this._protocolExtension);
    if (this._protocol.stream.destroyed) {
      return;
    }

    this._protocolExtension.send(msg);
  }

  override async _onMessage(msg: Buffer) {
    try {
      await this.open();
      if (this._messageHandler) {
        assert(this._protocol);
        const result = await this._messageHandler(this._protocol, msg);
        return buildMessage(result);
      }
    } catch (err: any) {
      this.emit('error', err);

      const responseError = new ERR_EXTENSION_RESPONSE_FAILED(this._name, err.code || 'Error', err.message);
      return {
        '@type': 'dxos.mesh.protocol.Error',
        code: responseError.responseCode,
        message: responseError.responseMessage
      };
    }
  }
}

/**
 * Wrap a message in a `dxos.protocol.Buffer` if required to be sent over the wire.
 */
const buildMessage = (message: Buffer | Uint8Array | WithTypeUrl<object>): WithTypeUrl<any> => {
  if (typeof message === 'string') {
    // Backwards compatibility.
    return buildMessage(Buffer.from(message));
  } else if (Buffer.isBuffer(message)) {
    return { '@type': 'dxos.mesh.protocol.Buffer', data: message };
  } else if (message instanceof Uint8Array) {
    return {
      '@type': 'dxos.mesh.protocol.Buffer',
      data: Buffer.from(message)
    };
  } else if (message == null) {
    // Apparently this is a use-case.
    return { '@type': 'dxos.mesh.protocol.Buffer', data: message };
  } else {
    assert(message['@type'], 'Message does not have a type URL.');
    return message;
  }
};
