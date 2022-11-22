//
// Copyright 2020 DXOS.org
//

import eos from 'end-of-stream';
import ProtocolStream, { ProtocolStreamOptions } from 'hypercore-protocol';
import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import type { Codec } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';

import {
  ERR_PROTOCOL_CONNECTION_INVALID,
  ERR_PROTOCOL_HANDSHAKE_FAILED,
  ERR_PROTOCOL_EXTENSION_MISSING
} from './errors';
import { Extension } from './extension';
import { ExtensionInit } from './extension-init';
import { keyToHuman } from './utils';

const kProtocol = Symbol('dxos.mesh.protocol');

export const getProtocolFromStream = (stream: any): Protocol => {
  assert(typeof stream === 'object' && typeof stream.pipe === 'function', 'stream is required');
  return stream[kProtocol];
};

export interface ExtendedProtocolStreamOptions extends ProtocolStreamOptions {
  /**
   * Used to detect if attempting to connect to self.
   */
  id?: Buffer;

  /**
   * Keep the ProtocolStream open forever.
   */
  live?: boolean;

  /**
   * Match the discovery_key with a public_key to do the handshake.
   */
  expectedFeeds?: number;
}

export interface ProtocolOptions {
  /**
   * https://github.com/mafintosh/hypercore-protocol#var-stream--protocoloptions
   */
  streamOptions?: ExtendedProtocolStreamOptions;

  /**
   * Define a codec to encode/decode messages from extensions.
   */
  codec?: Codec<any>;

  discoveryKey?: Buffer;
  discoveryToPublicKey?: (discoveryKey: Buffer) => Buffer | undefined;
  initTimeout?: number;
  initiator: boolean;
  userSession?: Record<string, any>;
}

/**
 * Wraps a hypercore-protocol object.
 */
export class Protocol {
  private _isOpen = false;

  readonly error = new Event<Error>();
  readonly extensionsInitialized = new Event();
  readonly extensionsHandshake = new Event();
  readonly handshake = new Event<this>();

  private readonly _discoveryToPublicKey: ProtocolOptions['discoveryToPublicKey'];
  private readonly _streamOptions: ExtendedProtocolStreamOptions | undefined;
  private readonly _initTimeout: number;
  private readonly _initiator!: boolean;
  private readonly _discoveryKey?: Buffer;

  /**
   * Protocol extensions.
   */
  private readonly _extensionMap = new Map<string, Extension>();

  /**
   * https://github.com/mafintosh/hypercore-protocol
   */
  private readonly _stream: ProtocolStream<FeedMessage>;

  private _extensionInit: ExtensionInit;
  private _init = false;
  private _connected = false;
  private _handshakes: ((protocol: Protocol) => Promise<void>)[] = [];

  /**
   * https://github.com/mafintosh/hypercore-protocol#var-feed--streamfeedkey
   */
  private _channel?: any = undefined;

  /**
   * Local object to store data for extensions.
   */
  private _context: Record<string, any> = {};

  constructor(options: ProtocolOptions = { initiator: false }) {
    const { discoveryToPublicKey = (key) => key, streamOptions, initTimeout = 5 * 1000 } = options;

    this._discoveryToPublicKey = discoveryToPublicKey;
    this._streamOptions = streamOptions;
    this._initTimeout = initTimeout;

    this._discoveryKey = options.discoveryKey;
    this._initiator = !!options.initiator;

    this._stream = new ProtocolStream<FeedMessage>(this._initiator, {
      ...this._streamOptions,
      onhandshake: async () => {
        try {
          await this.open();

          await this._initExtensions(options.userSession);
          this.extensionsInitialized.emit();

          await this.streamOptions?.onhandshake?.(this as any);
          await this._handshakeExtensions();
          this.extensionsHandshake.emit();
        } catch (err: any) {
          if (err.message.includes('NMSG_ERR_CLOSE')) {
            // Connection was closed during handshake.
            this._stream.destroy();
            return;
          }

          this._handleError(err);
        }
      }
    });

    (this._stream as any)[kProtocol] = this;
    this._stream.on('error', (err: any) => this.error.emit(err));
    this.error.on((err) => {
      // NOTE: ERROR Writable stream closed prematurely Error: Writable stream closed prematurely
      log.catch(err);
    });

    this._extensionInit = new ExtensionInit({ timeout: this._initTimeout });
  }

  toString() {
    const meta = {
      id: keyToHuman(this._stream.publicKey),
      extensions: this.extensionNames
    };

    return `Protocol(${JSON.stringify(meta)})`;
  }

  get id() {
    return this._stream.publicKey;
  }

  get stream() {
    return this._stream;
  }

  get channel() {
    return this._channel;
  }

  get extensions() {
    return Array.from(this._extensionMap.values());
  }

  get extensionNames(): string[] {
    return Array.from(this._extensionMap.keys());
  }

  get streamOptions(): ExtendedProtocolStreamOptions {
    return Object.assign({}, this._streamOptions, {
      id: this._stream!.publicKey
    });
  }

  get connected() {
    return this._connected;
  }

  get initiator() {
    return this._initiator;
  }

  /**
   * Get remote session data.
   */
  getSession(): Record<string, any> | null {
    try {
      return this._extensionInit.remoteUserSession;
    } catch (err: any) {
      return null;
    }
  }

  /**
   * Set local context.
   */
  setContext(context: any) {
    this._context = Object.assign({}, context);

    return this;
  }

  /**
   * Get local context.
   */
  getContext(): any {
    return this._context;
  }

  /**
   * Sets the named extension.
   */
  setExtension(extension: Extension) {
    assert(extension);
    this._extensionMap.set(extension.name, extension);

    return this;
  }

  /**
   * Sets the set of extensions.
   */
  setExtensions(extensions: Extension[]) {
    extensions.forEach((extension) => this.setExtension(extension));

    return this;
  }

  /**
   * Returns the extension by name.
   */
  getExtension(name: string): Extension | undefined {
    return this._extensionMap.get(name);
  }

  /**
   * Set protocol handshake handler.
   */
  setHandshakeHandler(handler: (protocol: Protocol) => void): Protocol {
    this._handshakes.push(async (protocol: Protocol) => {
      try {
        await handler(protocol);
      } catch (err: any) {
        throw new ERR_PROTOCOL_HANDSHAKE_FAILED(err.message);
      }
    });
    return this;
  }

  init() {
    assert(!this._init);

    this._init = true;
    this.open().catch((err: any) => this._handleError(err));

    log('initialized');
    return this;
  }

  @synchronized
  async open() {
    if (this._isOpen) {
      return;
    }

    log('opening...');
    await this._openExtensions();
    eos(this._stream as any, async () => {
      await this.close();
    });

    log('open', { key: PublicKey.from(this._stream.publicKey) });
    this._isOpen = true;
  }

  @synchronized
  async close() {
    if (!this._isOpen) {
      return;
    }

    log('closing...');
    this._connected = false;
    this._stream.finalize();
    await this._extensionInit.close().catch((err: any) => {
      this._handleError(err);
    });

    for (const [name, extension] of this._extensionMap) {
      log('close extension', { name, key: PublicKey.from(this._stream.publicKey) });
      await extension.close().catch((err: any) => {
        this._handleError(err);
      });
    }

    this._isOpen = false;
    log('closed');
  }

  async waitForHandshake(): Promise<void> {
    await Promise.race([this.handshake.waitForCount(1), this.error.waitForCount(1).then((err) => Promise.reject(err))]);
  }

  private async _openExtensions() {
    await this._extensionInit.openWithProtocol(this);

    for (const [name, extension] of this._extensionMap) {
      log('open extension', { name, key: PublicKey.from(this._stream.publicKey) });
      await extension.openWithProtocol(this);
    }
  }

  private async _initExtensions(userSession?: Record<string, any>) {
    try {
      // Exchanging sessions since other extensions (like Bot Plugin) might depend on the session being already there.
      await this._extensionInit.sendSession(userSession);

      for (const [name, extension] of this._extensionMap) {
        log('init extension', {
          name,
          key: PublicKey.from(this._stream.publicKey),
          remote: PublicKey.from(this._stream.remotePublicKey)
        });
        await extension.onInit();
      }

      await this._extensionInit.continue();
    } catch (err: any) {
      await this._extensionInit.break();
      throw err;
    }
  }

  private async _handshakeExtensions() {
    try {
      for (const handshake of this._handshakes) {
        await handshake(this);
      }

      for (const [name, extension] of this._extensionMap) {
        log('handshake extension', {
          name,
          key: PublicKey.from(this._stream.publicKey),
          remote: PublicKey.from(this._stream.remotePublicKey)
        });
        await extension.onHandshake();
      }
    } catch (err: any) {
      if (this._stream.destroyed) {
        log.warn('handshake', err);
      } else {
        log.catch(err);
      }
    }

    this.handshake.emit(this);
    this._connected = true;

    this._stream.on('feed', async (discoveryKey: Buffer) => {
      try {
        for (const [name, extension] of this._extensionMap) {
          log('handshake feed', {
            name,
            key: PublicKey.from(this._stream.publicKey),
            remote: PublicKey.from(this._stream.remotePublicKey)
          });
          await extension.onFeed(discoveryKey);
        }
      } catch (err: any) {
        this._handleError(err);
      }
    });
  }

  private _openConnection() {
    let initialKey = null;

    const openChannel = (discoveryKey: Buffer) => {
      try {
        initialKey = this._discoveryToPublicKey?.(discoveryKey);
        if (!initialKey) {
          throw new ERR_PROTOCOL_CONNECTION_INVALID('Key not found');
        }

        // Init stream.
        this._channel = this._stream.open(initialKey, {
          onextension: this._extensionHandler
        }); // Needs a list of extension right away.
      } catch (err: any) {
        let newErr = err;
        if (!ERR_PROTOCOL_CONNECTION_INVALID.equals(newErr)) {
          newErr = ERR_PROTOCOL_CONNECTION_INVALID.from(newErr);
        }
        this._handleError(newErr);
      }
    };

    /* If this protocol stream is being created via a swarm connection event,
     * only the client side will know the topic (ie, initial feed key to share).
     */
    if (this._discoveryKey) {
      openChannel(this._discoveryKey);
    } else {
      // Wait for the peer to share the initial feed and see if we have the public key for that.
      this._stream.once('feed', openChannel); // TODO(unknown): Probably not working anymore.
    }
  }

  /**
   * Handles extension messages.
   */
  private _extensionHandler = (name: string, message: any) => {
    if (name === this._extensionInit.name) {
      this._extensionInit.emit('extension-message', message);
      return;
    }

    const extension = this._extensionMap.get(name);
    if (!extension) {
      this._handleError(new ERR_PROTOCOL_EXTENSION_MISSING(name));
      return;
    }

    extension.emit('extension-message', message);
  };

  private _handleError(err: Error) {
    log.catch(err);
    process.nextTick(() => this._stream.destroy(err));
  }
}
