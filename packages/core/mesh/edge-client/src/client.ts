//
// Copyright 2024 DXOS.org
//

import WebSocket from 'isomorphic-ws';

import { Trigger } from '@dxos/async';
import { Resource, type Lifecycle } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { type Message, MessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from './defs';
import { type Protocol, toUint8Array } from './protocol';

const DEFAULT_TIMEOUT = 5_000;

export type MessageListener = (message: Message) => void | Promise<void>;

/**
 *
 */
export interface EdgeConnection extends Required<Lifecycle> {
  get info(): any;
  get identityKey(): PublicKey;
  get deviceKey(): PublicKey;
  get isOpen(): boolean;
  setIdentity({ deviceKey, identityKey }: { deviceKey: PublicKey; identityKey: PublicKey }): Promise<void>;
  addListener(listener: MessageListener): () => void;
  send(message: Message): Promise<void>;
}

export type MessengerConfig = {
  socketEndpoint: string;
  timeout?: number;
  protocol?: Protocol;
};

/**
 * Messenger client.
 */
// TODO(dmaretskyi): Rename EdgeClient.
export class EdgeClient extends Resource implements EdgeConnection {
  private readonly _listeners: Set<MessageListener> = new Set();
  private readonly _protocol: Protocol;
  private _ws?: WebSocket;
  private _ready = new Trigger();

  constructor(
    private _identityKey: PublicKey,
    private _deviceKey: PublicKey,
    private readonly _config: MessengerConfig,
  ) {
    super();
    this._protocol = this._config.protocol ?? protocol;
  }

  // TODO(burdon): Attach logging.
  public get info() {
    return {
      open: this.isOpen,
      identity: this._identityKey,
      device: this._deviceKey,
    };
  }

  get identityKey() {
    return this._identityKey;
  }

  get deviceKey() {
    return this._deviceKey;
  }

  public get isOpen() {
    return !!this._ws;
  }

  async setIdentity({ deviceKey, identityKey }: { deviceKey: PublicKey; identityKey: PublicKey }) {
    await this.close();
    this._deviceKey = deviceKey;
    this._identityKey = identityKey;
    await this.open();
  }

  public addListener(listener: MessageListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Open connection to messaging service.
   */
  protected override async _open() {
    if (this._ws) {
      return;
    }
    invariant(this._deviceKey && this._identityKey);
    log.info('opening...', { info: this.info });

    // TODO: handle reconnects
    const url = new URL(`/ws/${this._identityKey.toHex()}/${this._deviceKey.toHex()}`, this._config.socketEndpoint);
    this._ws = new WebSocket(url);
    Object.assign<WebSocket, Partial<WebSocket>>(this._ws, {
      onopen: () => {
        log.info('opened', this.info);
        this._ready.wake();
      },

      onclose: () => {
        log.info('closed', this.info);
        this._ready.wake();
      },

      onerror: (event) => {
        log.catch(event.error, this.info);
        this._ready.throw(event.error);
      },

      /**
       * https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent/data
       */
      onmessage: async (event) => {
        const data = await toUint8Array(event.data);
        const message = buf.fromBinary(MessageSchema, data);
        log('received', { deviceKey: this._deviceKey, payload: protocol.getPayloadType(message) });
        if (message) {
          for (const listener of this._listeners) {
            try {
              await listener(message);
            } catch (err) {
              log.error('processing', { err, payload: protocol.getPayloadType(message) });
            }
          }
        }
      },
    });

    await this._ready.wait({ timeout: this._config.timeout ?? DEFAULT_TIMEOUT });
    log.info('opened', { info: this.info });
  }

  /**
   * Close connection and free resources.
   */
  protected override async _close() {
    if (this._ws) {
      log.info('closing...', { deviceKey: this._deviceKey });
      this._ready.reset();
      this._ws.close();
      this._ws = undefined;
      log.info('closed', { deviceKey: this._deviceKey });
    }
  }

  /**
   * Send message.
   * NOTE: The message is guaranteed to be delivered but the service must respond with a message to confirm processing.
   */
  // TODO(burdon): Implement ACK?
  public async send(message: Message): Promise<void> {
    await this._ready.wait({ timeout: this._config.timeout ?? DEFAULT_TIMEOUT });
    invariant(this._ws);
    log('sending...', { deviceKey: this._deviceKey, payload: protocol.getPayloadType(message) });
    this._ws.send(buf.toBinary(MessageSchema, message));
  }
}
