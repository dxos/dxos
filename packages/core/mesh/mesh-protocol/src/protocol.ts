//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import eos from 'end-of-stream';
import ProtocolStream, { ProtocolStreamOptions as ProtocolStreamOptionsDef } from 'hypercore-protocol';
import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import type { Codec } from '@dxos/codec-protobuf';

import {
  ERR_PROTOCOL_CONNECTION_INVALID,
  ERR_PROTOCOL_HANDSHAKE_FAILED,
  ERR_PROTOCOL_EXTENSION_MISSING
} from './errors';
import { Extension } from './extension';
import { ExtensionInit } from './extension-init';
import { keyToHuman } from './utils';

const log = debug('dxos:protocol');

const kProtocol = Symbol('dxos.mesh.protocol');

export interface ProtocolStreamOptions extends ProtocolStreamOptionsDef {
  /**
   * You can use this to detect if you connect to yourself.
   */
  id?: Buffer

  /**
   * Signal to the other peer that you want to keep this stream open forever.
   */
  live?: boolean

  /**
   * Match the discovery_key with a public_key to do the handshake.
   */
  expectedFeeds?: number
}

export interface ProtocolOptions {
  discoveryToPublicKey?: (discoveryKey: Buffer) => (Buffer | undefined)

  /**
   * https://github.com/mafintosh/hypercore-protocol#var-stream--protocoloptions
   */
  streamOptions?: ProtocolStreamOptionsDef

  discoveryKey?: Buffer

  initTimeout?: number

  /**
   * Define a codec to encode/decode messages from extensions.
   */
  codec?: Codec<any>

  initiator: boolean

  userSession?: Record<string, any>
}

/**
 * Wraps a hypercore-protocol object.
 */
// TODO(burdon): Must rename this class.
export class Protocol {
  private _isOpen = false;

  readonly error = new Event<Error>();
  readonly extensionsInitialized = new Event();
  readonly extensionsHandshake = new Event();
  readonly handshake = new Event<this>();

  private readonly _discoveryToPublicKey: ProtocolOptions['discoveryToPublicKey'];
  private readonly _streamOptions: ProtocolStreamOptions | undefined;
  private readonly _initTimeout: number;
  private readonly _initiator!: boolean;
  private readonly _discoveryKey?: Buffer;

  private _extensionInit: ExtensionInit;
  private _init = false;
  private _connected = false;
  private _handshakes: ((protocol: Protocol) => Promise<void>)[] = [];

  /**
   * Protocol extensions.
   */
  private _extensionMap = new Map<string, Extension>();

  /**
   * https://github.com/mafintosh/hypercore-protocol
   */
  private readonly _stream: ProtocolStream;

  /**
   * https://github.com/mafintosh/hypercore-protocol#var-feed--streamfeedkey
   */
  private _channel?: any = undefined;

  /**
   * Local object to store data for extensions.
   */
  private _context: Record<string, any> = {};

  constructor (options: ProtocolOptions = { initiator: false }) {
    const { discoveryToPublicKey = key => key, streamOptions, initTimeout = 5 * 1000 } = options;
    this._discoveryToPublicKey = discoveryToPublicKey;
    this._streamOptions = streamOptions;
    this._initTimeout = initTimeout;

    this._discoveryKey = options.discoveryKey;
    this._initiator = !!options.initiator;

    this._stream = new ProtocolStream(this._initiator, {
      ...this._streamOptions,
      onhandshake: async () => {
        try {
          await this.open();

          await this._initExtensions(options.userSession);
          this.extensionsInitialized.emit();

          await this.streamOptions?.onhandshake?.(this as any); // TODO(burdon): Cast to this.
          await this._handshakeExtensions();
          this.extensionsHandshake.emit();
        } catch (err: any) {
          this._handleError(err);
        }
      }
    });

    (this._stream as any)[kProtocol] = this;
    this._stream.on('error', (err: any) => this.error.emit(err));
    this.error.on(error => log(error));

    this._extensionInit = new ExtensionInit({ timeout: this._initTimeout });
  }

  toString () {
    const meta = {
      id: keyToHuman(this._stream.publicKey),
      extensions: this.extensionNames
    };

    return `Protocol(${JSON.stringify(meta)})`;
  }

  get id () {
    return this._stream.publicKey;
  }

  get stream () {
    return this._stream;
  }

  get channel () {
    return this._channel;
  }

  get extensions () {
    return Array.from(this._extensionMap.values());
  }

  get extensionNames (): string[] {
    return Array.from(this._extensionMap.keys());
  }

  get streamOptions () {
    return Object.assign({}, { id: this._stream!.publicKey }, this._streamOptions);
  }

  get connected () {
    return this._connected;
  }

  get initiator () {
    return this._initiator;
  }

  /**
   * Get remote session data.
   */
  getSession (): Record<string, any> | null {
    try {
      return this._extensionInit.remoteUserSession;
    } catch (err: any) {
      return null;
    }
  }

  /**
   * Set local context.
   */
  setContext (context: any) {
    this._context = Object.assign({}, context);

    return this;
  }

  /**
   * Get local context.
   */
  getContext (): any {
    return this._context;
  }

  /**
   * Sets the named extension.
   */
  setExtension (extension: Extension) {
    assert(extension);
    this._extensionMap.set(extension.name, extension);

    return this;
  }

  /**
   * Sets the set of extensions.
   */
  setExtensions (extensions: Extension[]) {
    extensions.forEach(extension => this.setExtension(extension));

    return this;
  }

  /**
   * Returns the extension by name.
   */
  getExtension (name: string): Extension | undefined {
    return this._extensionMap.get(name);
  }

  /**
   * Set protocol handshake handler.
   */
  setHandshakeHandler (handler: (protocol: Protocol) => void): Protocol {
    this._handshakes.push(async (protocol: Protocol) => {
      try {
        await handler(protocol);
      } catch (err: any) {
        throw new ERR_PROTOCOL_HANDSHAKE_FAILED(err.message);
      }
    });
    return this;
  }

  init () {
    assert(!this._init);

    this._init = true;
    this.open().catch((err: any) => this._handleError(err));

    return this;
  }

  @synchronized
  async open () {
    if (this._isOpen) {
      return;
    }
    await this._openExtensions();

    eos(this._stream as any, async () => {
      await this.close();
    });

    log(keyToHuman(this._stream.publicKey, 'node'), 'initialized');

    this._isOpen = true;
  }

  @synchronized
  async close () {
    if (!this._isOpen) {
      return;
    }

    this._connected = false;
    this._stream.finalize();
    await this._extensionInit.close().catch((err: any) => this._handleError(err));
    for (const [name, extension] of this._extensionMap) {
      log(`close extension "${name}"`);
      await extension.close().catch((err: any) => this._handleError(err));
    }

    this._isOpen = false;
  }

  async waitForHandshake (): Promise<void> {
    await Promise.race([
      this.handshake.waitForCount(1),
      this.error.waitForCount(1).then(err => Promise.reject(err))
    ]);
  }

  private async _openExtensions () {
    await this._extensionInit.openWithProtocol(this);

    for (const [name, extension] of this._extensionMap) {
      log(`open extension "${name}": ${keyToHuman(this._stream.publicKey, 'node')}`);
      await extension.openWithProtocol(this);
    }
  }

  private async _initExtensions (userSession?: Record<string, any>) {
    try {
      // Exchanging sessions, because other extensions (like Bot Plugin) might depend on the session being already there.
      await this._extensionInit.sendSession(userSession);

      for (const [name, extension] of this._extensionMap) {
        log(`init extension "${name}": ${keyToHuman(this._stream.publicKey)} <=> ${keyToHuman(this._stream.remotePublicKey)}`);
        await extension.onInit();
      }

      await this._extensionInit.continue();
    } catch (err: any) {
      await this._extensionInit.break();
      throw err;
    }
  }

  private async _handshakeExtensions () {
    for (const handshake of this._handshakes) {
      await handshake(this);
    }

    for (const [name, extension] of this._extensionMap) {
      log(`handshake extension "${name}": ${keyToHuman(this._stream.publicKey)} <=> ${keyToHuman(this._stream.remotePublicKey)}`);
      await extension.onHandshake();
    }

    log(`handshake: ${keyToHuman(this._stream.publicKey)} <=> ${keyToHuman(this._stream.remotePublicKey)}`);
    this.handshake.emit(this);
    this._connected = true;

    // TODO: Redo this.
    this._stream.on('feed', async (discoveryKey: Buffer) => {
      try {
        for (const [name, extension] of this._extensionMap) {
          log(`feed extension "${name}": ${keyToHuman(this._stream.publicKey)} <=> ${keyToHuman(this._stream.remotePublicKey)}`);
          await extension.onFeed(discoveryKey);
        }
      } catch (err: any) {
        this._handleError(err);
      }
    });
  }

  private _openConnection () {
    let initialKey = null;

    const openChannel = (discoveryKey: Buffer) => {
      try {
        initialKey = this._discoveryToPublicKey?.(discoveryKey);
        if (!initialKey) {
          throw new ERR_PROTOCOL_CONNECTION_INVALID('key not found');
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

  private _handleError (error: Error) {
    console.error(error);
    process.nextTick(() => this._stream.destroy(error));
  }
}

export const getProtocolFromStream = (stream: any): Protocol => {
  assert(typeof stream === 'object' && typeof stream.pipe === 'function', 'stream is required');
  return stream[kProtocol];
};
