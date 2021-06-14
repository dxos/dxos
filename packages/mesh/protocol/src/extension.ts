//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import eos from 'end-of-stream';
import { Nanomessage, errors as nanomessageErrors } from 'nanomessage';

import { patchBufferCodec, WithTypeUrl } from '@dxos/codec-protobuf';

import {
  ERR_PROTOCOL_STREAM_CLOSED,
  ERR_EXTENSION_INIT_FAILED,
  ERR_EXTENSION_HANDSHAKE_FAILED,
  ERR_EXTENSION_FEED_FAILED,
  ERR_EXTENSION_CLOSE_FAILED,
  ERR_EXTENSION_RESPONSE_FAILED,
  ERR_EXTENSION_RESPONSE_TIMEOUT
} from './errors';
import { schema } from './proto/gen';
import * as proto from './proto/gen/dxos/protocol';
import { Protocol } from './protocol';
import { keyToHuman } from './utils';

const { NMSG_ERR_TIMEOUT } = nanomessageErrors;

const log = debug('dxos:protocol:extension');

export interface ExtensionOptions {
  /**
   * Protobuf schema json.
   */
  schema?: Record<string, any>

  [key: string]: any;
}

export type InitHandler = (protocol: Protocol) => Promise<void>;

export type HandshakeHandler = (protocol: Protocol) => Promise<void>;

export type CloseHandler = (protocol: Protocol) => Promise<void>

export type MessageHandler = (protocol: Protocol, message: any) => Promise<any>

export type FeedHandler = (protocol: Protocol, discoveryKey: Buffer) => Promise<void>

/**
 * Reliable message passing via using Dat protocol extensions.
 *
 * Events: "send", "receive", "error"
 */
export class Extension extends Nanomessage {
  public _name: any;
  public codec: any;
  public on: any;
  public open: any;
  public request: any;
  public close: any;
  public emit: any;
  public userSchema: any;
  public nmOptions: any;

  private _protocol: Protocol | null = null;

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

  /**
   * @param {string} name
   * @param {Object} options
   * @param {Number} options.timeout
   */
  constructor (name: string, { schema: userSchema, ...nmOptions }: ExtensionOptions = {}) {
    super(nmOptions);

    assert(typeof name === 'string' && name.length > 0, 'name is required.');

    this._name = name;

    this.codec = schema.getCodecForType('dxos.protocol.Message');

    if (userSchema) {
      this.codec.addJson(userSchema);
    }

    this.codec = patchBufferCodec(this.codec);

    this.on('error', (err: any) => log(err));
  }

  get name () {
    return this._name;
  }

  setInitHandler (initHandler: InitHandler) {
    this._initHandler = initHandler;
    return this;
  }

  /**
   * Sets the handshake handler.
   * @param {Function<{protocol}>} handshakeHandler - Async handshake handler.
   * @returns {Extension}
   */
  setHandshakeHandler (handshakeHandler: HandshakeHandler) {
    this._handshakeHandler = handshakeHandler;

    return this;
  }

  /**
   * Sets the close stream handler.
   * @param {Function<{protocol}>} closeHandler - Close handler.
   * @returns {Extension}
   */
  setCloseHandler (closeHandler: CloseHandler) {
    this._closeHandler = closeHandler;

    return this;
  }

  /**
   * Sets the message handler.
   * @param {Function<{protocol, message}>} messageHandler - Async message handler.
   * @returns {Extension}
   */
  setMessageHandler (messageHandler: MessageHandler) {
    this._messageHandler = messageHandler;

    return this;
  }

  /**
   * Sets the message handler.
   * @param {Function<{protocol, discoveryKey}>} feedHandler - Async feed handler.
   * @returns {Extension}
   */
  setFeedHandler (feedHandler: FeedHandler) {
    this._feedHandler = feedHandler;

    return this;
  }

  /**
   * Initializes the extension.
   *
   * @param {Protocol} protocol
   */
  async openWithProtocol (protocol: Protocol) {
    assert(!this._protocol);
    log(`init[${this._name}]: ${keyToHuman(protocol.id)}`);

    this._protocol = protocol;

    await this.open();
  }

  async onInit () {
    try {
      await this.open();

      assert(this._protocol);
      if (this._protocol.stream.destroyed) {
        throw new ERR_PROTOCOL_STREAM_CLOSED();
      }

      if (this._initHandler) {
        await this._initHandler(this._protocol);
      }
    } catch (err) {
      throw ERR_EXTENSION_INIT_FAILED.from(err);
    }
  }

  /**
   * Handshake event.
   */
  async onHandshake () {
    try {
      await this.open();
      assert(this._protocol);
      if (this._protocol.stream.destroyed) {
        throw new ERR_PROTOCOL_STREAM_CLOSED();
      }

      if (this._handshakeHandler) {
        await this._handshakeHandler(this._protocol);
      }
    } catch (err) {
      throw ERR_EXTENSION_HANDSHAKE_FAILED.from(err);
    }
  }

  /**
   * Feed event.
   *
   * @param {Buffer} discoveryKey
   */
  async onFeed (discoveryKey: Buffer) {
    try {
      await this.open();
      assert(this._protocol);
      if (this._protocol.stream.destroyed) {
        throw new ERR_PROTOCOL_STREAM_CLOSED();
      }

      if (this._feedHandler) {
        await this._feedHandler(this._protocol, discoveryKey);
      }
    } catch (err) {
      throw ERR_EXTENSION_FEED_FAILED.from(err);
    }
  }

  /**
   * Sends a message to peer.
   * @param {(Object|Buffer)} message
   * @param {Object} options
   * @param {Boolean} options.oneway
   * @returns {Promise<Object>} Response from peer.
   */
  async send (message: Buffer | WithTypeUrl<object>, options: { oneway?: boolean } = {}) {
    assert(this._protocol);
    if (this._protocol.stream.destroyed) {
      throw new ERR_PROTOCOL_STREAM_CLOSED();
    }

    if (options.oneway) {
      return super.send(this._buildMessage(message));
    }

    try {
      const response = await this.request(this._buildMessage(message));

      if (response && response.code && response.message) {
        console.log(response)
        throw new ERR_EXTENSION_RESPONSE_FAILED(this._name, response.code, response.message);
      }

      return { response };
    } catch (err) {
      console.error(err)
      if (ERR_EXTENSION_RESPONSE_FAILED.equals(err)) {
        throw err;
      }

      if (NMSG_ERR_TIMEOUT.equals(err)) {
        throw ERR_EXTENSION_RESPONSE_TIMEOUT.from(err);
      }

      throw new ERR_EXTENSION_RESPONSE_FAILED(this._name, err.code || 'Error', err.message);
    }
  }

  // Nanomesssage interface
  private async _open () {
    assert(this._protocol);
    if (this._protocol.stream.destroyed) {
      throw new ERR_PROTOCOL_STREAM_CLOSED();
    }

    assert(this._protocol);
    eos(this._protocol.stream, () => {
      this.close();
    });

    await super._open();
  }

  // @override
  private async _close () {
    try {
      await super._close();
      if (this._closeHandler) {
        assert(this._protocol);
        await this._closeHandler(this._protocol);
      }
    } catch (err) {
      throw ERR_EXTENSION_CLOSE_FAILED.from(err);
    }
  }

  private _subscribe (next: (msg: any) => Promise<void>) {
    this.on('extension-message', async (message: any) => {
      try {
        await next(message);
      } catch (err) {
        this.emit('error', err);
      }
    });
  }

  private _send (chunk: Buffer) {
    assert(this._protocol);
    if (this._protocol.stream.destroyed) {
      return;
    }
    this._protocol.feed.extension(this._name, chunk);
  }

  /**
   * @override _onMessage from Nanomessagerpc
   */
  private async _onMessage (msg: any) {
    try {
      await this.open();
      if (this._messageHandler) {
        assert(this._protocol);
        const result = await this._messageHandler(this._protocol, msg);
        return this._buildMessage(result);
      }
    } catch (err) {
      this.emit('error', err);
      const responseError = new ERR_EXTENSION_RESPONSE_FAILED(this._name, err.code || 'Error', err.message);
      return {
        __type_url: 'dxos.protocol.Error',
        code: responseError.responseCode,
        message: responseError.responseMessage
      };
    }
  }

  /**
   * Wrap a message in a `dxos.protocol.Buffer` if required to be sent over the wire.
   */
  private _buildMessage (message: Buffer | WithTypeUrl<object>): WithTypeUrl<any> {
    if (typeof message === 'string') { // Backwards compatibility.
      return this._buildMessage(Buffer.from(message));
    } else if(Buffer.isBuffer(message) || message instanceof Uint8Array) {
      return { __type_url: 'dxos.protocol.Buffer', data: message };
    } else if(message == null) { // Apparently this is a use-case.
      return { __type_url: 'dxos.protocol.Buffer', data: message };
    } else {
      assert(message.__type_url, 'Message does not have a type URL.');
      
      return message;
    }
  }
}
