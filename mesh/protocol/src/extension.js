//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import eos from 'end-of-stream';
import { Nanomessage, errors as nanomessageErrors } from 'nanomessage';

import { Schema, anySubstitutions } from '@dxos/codec-protobuf';

import {
  ERR_PROTOCOL_STREAM_CLOSED,
  ERR_EXTENSION_INIT_FAILED,
  ERR_EXTENSION_HANDSHAKE_FAILED,
  ERR_EXTENSION_FEED_FAILED,
  ERR_EXTENSION_CLOSE_FAILED,
  ERR_EXTENSION_RESPONSE_FAILED,
  ERR_EXTENSION_RESPONSE_TIMEOUT
} from './errors';
import schema from './schema.json';
import { keyToHuman } from './utils';

const { NMSG_ERR_TIMEOUT } = nanomessageErrors;

const log = debug('dxos:protocol:extension');

/**
 * Reliable message passing via using Dat protocol extensions.
 *
 * Events: "send", "receive", "error"
 */
export class Extension extends Nanomessage {
  /**
   * @type {Protocol}
   */
  _protocol = null;

  /**
   * Handshake handler.
   * @type {Function<{protocol}>}
   */
  _handshakeHandler = null;

  /**
   * Close handler.
   * @type {Function<{protocol}>}
   */
  _closeHandler = null;

  /**
   * Message handler.
   * @type {Function<{protocol, message}>}
   */
  _messageHandler = null;

  /**
   * Feed handler.
   * @type {Function<{protocol, discoveryKey}>}
   */
  _feedHandler = null;

  /**
   * @param {string} name
   * @param {Object} options
   * @param {Number} options.timeout
   */
  constructor (name, options = {}) {
    assert(typeof name === 'string' && name.length > 0, 'name is required.');

    const { schema: userSchema, ...nmOptions } = options;

    super(nmOptions);

    this._name = name;

    this.codec = Schema.fromJson(schema, anySubstitutions)
      .getCodecForType('dxos.protocol.Message');

    if (userSchema) {
      this.codec.addJson(userSchema);
    }

    this.codec.encode.bind(this.codec);
    this.codec.decode.bind(this.codec);
    this.on('error', err => log(err));
  }

  get name () {
    return this._name;
  }

  setInitHandler (initHandler) {
    this._initHandler = initHandler;
    return this;
  }

  /**
   * Sets the handshake handler.
   * @param {Function<{protocol}>} handshakeHandler - Async handshake handler.
   * @returns {Extension}
   */
  setHandshakeHandler (handshakeHandler) {
    this._handshakeHandler = handshakeHandler;

    return this;
  }

  /**
   * Sets the close stream handler.
   * @param {Function<{protocol}>} closeHandler - Close handler.
   * @returns {Extension}
   */
  setCloseHandler (closeHandler) {
    this._closeHandler = closeHandler;

    return this;
  }

  /**
   * Sets the message handler.
   * @param {Function<{protocol, message}>} messageHandler - Async message handler.
   * @returns {Extension}
   */
  setMessageHandler (messageHandler) {
    this._messageHandler = messageHandler;

    return this;
  }

  /**
   * Sets the message handler.
   * @param {Function<{protocol, discoveryKey}>} feedHandler - Async feed handler.
   * @returns {Extension}
   */
  setFeedHandler (feedHandler) {
    this._feedHandler = feedHandler;

    return this;
  }

  /**
   * Initializes the extension.
   *
   * @param {Protocol} protocol
   */
  async openWithProtocol (protocol) {
    assert(!this._protocol);
    log(`init[${this._name}]: ${keyToHuman(protocol.id)}`);

    this._protocol = protocol;

    await this.open();
  }

  async onInit () {
    try {
      await this.open();
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
  async onFeed (discoveryKey) {
    try {
      await this.open();
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
  async send (message, options = {}) {
    if (this._protocol.stream.destroyed) {
      throw new ERR_PROTOCOL_STREAM_CLOSED();
    }

    if (options.oneway) {
      return super.send(this._buildMessage(message));
    }

    try {
      const response = await this.request(this._buildMessage(message));

      if (response && response.code && response.message) {
        throw new ERR_EXTENSION_RESPONSE_FAILED(response.code, response.message);
      }

      return { response };
    } catch (err) {
      if (ERR_EXTENSION_RESPONSE_FAILED.equals(err)) {
        throw err;
      }

      if (NMSG_ERR_TIMEOUT.equals(err)) {
        throw ERR_EXTENSION_RESPONSE_TIMEOUT.from(err);
      }

      throw new ERR_EXTENSION_RESPONSE_FAILED(err.code || 'Error', err.message);
    }
  }

  // Nanomesssage interface

  async _open () {
    if (this._protocol.stream.destroyed) {
      throw new ERR_PROTOCOL_STREAM_CLOSED();
    }

    eos(this._protocol.stream, () => {
      this.close();
    });

    await super._open();
  }

  async _close () {
    try {
      await super._close();
      if (this._closeHandler) {
        await this._closeHandler(this._protocol);
      }
    } catch (err) {
      throw ERR_EXTENSION_CLOSE_FAILED.from(err);
    }
  }

  _subscribe (next) {
    this.on('extension-message', async message => {
      try {
        await next(message);
      } catch (err) {
        this.emit('error', err);
      }
    });
  }

  _send (chunk) {
    if (this._protocol.stream.destroyed) {
      return;
    }
    this._protocol.feed.extension(this._name, chunk);
  }

  async _onMessage (msg) {
    try {
      await this.open();
      if (this._messageHandler) {
        const result = await this._messageHandler(this._protocol, msg);
        return this._buildMessage(result);
      }
    } catch (err) {
      this.emit('error', err);
      const responseError = new ERR_EXTENSION_RESPONSE_FAILED(err.code || 'Error', err.message);
      return {
        __type_url: 'dxos.protocol.Error',
        code: responseError.responseCode,
        message: responseError.responseMessage
      };
    }
  }

  _buildMessage (message) {
    if (!Buffer.isBuffer(message) && typeof message === 'object' && message.__type_url) {
      return message;
    }

    if (typeof message === 'string') {
      message = Buffer.from(message);
    }

    return { __type_url: 'dxos.protocol.Buffer', data: message };
  }
}
