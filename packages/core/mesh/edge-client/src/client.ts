//
// Copyright 2024 DXOS.org
//

import WebSocket from 'isomorphic-ws';

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Message, MessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { fromBinary, toBinary } from '@bufbuild/protobuf';

import { protocol } from './defs';
import { type Protocol, toUint8Array } from './protocol';

const DEFAULT_TIMEOUT = 5_000;

export type MessageListener = (message: Message) => void | Promise<void>;

/**
 *
 */
// TODO(dmaretskyi): Rename EdgeConnection
export interface Messenger {
  get info(): any;
  get identityKey(): PublicKey;
  get deviceKey(): PublicKey;
  get isOpen(): boolean;
  addListener(listener: MessageListener): () => void;
  open(): Promise<boolean>;
  close(): Promise<void>;
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
export class MessengerClient implements Messenger {
  private readonly _listeners: Set<MessageListener> = new Set();
  private readonly _protocol: Protocol;
  private _ws?: WebSocket;

  constructor(
    private readonly _identityKey: PublicKey,
    private readonly _deviceKey: PublicKey,
    private readonly _config: MessengerConfig,
  ) {
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

  public addListener(listener: MessageListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Open connection to messaging service.
   */
  public async open(): Promise<boolean> {
    invariant(!this._ws);
    log.info('opening...', { info: this.info });
    const ready = new Trigger<boolean>();

    const url = new URL(`/ws/${this._identityKey.toHex()}/${this._deviceKey.toHex()}`, this._config.socketEndpoint);
    this._ws = new WebSocket(url);
    Object.assign<WebSocket, Partial<WebSocket>>(this._ws, {
      onopen: () => {
        log.info('opened', this.info);
        ready.wake(true);
      },

      onclose: () => {
        log.info('closed', this.info);
        ready.wake(false);
      },

      onerror: (event) => {
        log.catch(event.error, this.info);
        ready.throw(event.error);
      },

      /**
       * https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent/data
       */
      onmessage: async (event) => {
        const data = await toUint8Array(event.data);
        const message = fromBinary(MessageSchema, data);
        log.info('received', { deviceKey: this._deviceKey, payload: protocol.getPayloadType(message) });
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

    const result = await ready.wait({ timeout: this._config.timeout ?? DEFAULT_TIMEOUT });
    log.info('opened', { info: this.info });
    return result;
  }

  /**
   * Close connection and free resources.
   */
  public async close() {
    if (this._ws) {
      log.info('closing...', { deviceKey: this._deviceKey });
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
    invariant(this._ws);
    log.info('sending...', { deviceKey: this._deviceKey, payload: protocol.getPayloadType(message) });
    this._ws.send(toBinary(MessageSchema, message));
  }
}
