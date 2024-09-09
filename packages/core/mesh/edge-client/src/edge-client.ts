//
// Copyright 2024 DXOS.org
//

import WebSocket from 'isomorphic-ws';

import { Trigger, Event } from '@dxos/async';
import { LifecycleState, Resource, type Lifecycle } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { type Message, MessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from './defs';
import { PersistentLifecycle } from './persistent-lifecycle';
import { type Protocol, toUint8Array } from './protocol';

const DEFAULT_TIMEOUT = 5_000;

export type MessageListener = (message: Message) => void | Promise<void>;

export interface EdgeConnection extends Required<Lifecycle> {
  reconnect: Event;

  get info(): any;
  get identityKey(): string;
  get peerKey(): string;
  get isOpen(): boolean;
  setIdentity(params: { peerKey: string; identityKey: string }): void;
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
export class EdgeClient extends Resource implements EdgeConnection {
  public reconnect = new Event();
  private readonly _persistentLifecycle = new PersistentLifecycle({
    start: async () => this._openWebSocket(),
    stop: async () => this._closeWebSocket(),
    onRestart: async () => this.reconnect.emit(),
  });

  private readonly _listeners = new Set<MessageListener>();
  private readonly _protocol: Protocol;
  private _ready = new Trigger();
  private _ws?: WebSocket = undefined;

  constructor(
    private _identityKey: string,
    private _peerKey: string,
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
      device: this._peerKey,
    };
  }

  get identityKey() {
    return this._identityKey;
  }

  get peerKey() {
    return this._peerKey;
  }

  public get isOpen() {
    return this._lifecycleState === LifecycleState.OPEN;
  }

  setIdentity({ peerKey, identityKey }: { peerKey: string; identityKey: string }) {
    this._peerKey = peerKey;
    this._identityKey = identityKey;
    this._persistentLifecycle.scheduleRestart();
  }

  public addListener(listener: MessageListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Open connection to messaging service.
   */
  protected override async _open() {
    log('opening...', { info: this.info });
    invariant(this._peerKey && this._identityKey);
    await this._persistentLifecycle.open();
    if (this._ws) {
      return;
    }

    await this._openWebSocket().catch((err) => log.warn('Error while opening websocket', { err }));
    log('opened', { info: this.info });
  }

  /**
   * Close connection and free resources.
   */
  protected override async _close() {
    log('closing...', { peerKey: this._peerKey });
    await this._persistentLifecycle.close();
    await this._closeWebSocket();
    log('closed', { peerKey: this._peerKey });
  }

  private async _openWebSocket() {
    const url = new URL(`/ws/${this._identityKey}/${this._peerKey}`, this._config.socketEndpoint);
    this._ws = new WebSocket(url);
    Object.assign<WebSocket, Partial<WebSocket>>(this._ws, {
      onopen: () => {
        log('opened', this.info);
        this._ready.wake();
      },

      onclose: () => {
        log('closed', this.info);
        this._persistentLifecycle.scheduleRestart();
      },

      onerror: (event) => {
        log.warn('EdgeClient socket error', { error: event.error, info: event.message });
        this._persistentLifecycle.scheduleRestart();
      },

      /**
       * https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent/data
       */
      onmessage: async (event) => {
        const data = await toUint8Array(event.data);
        const message = buf.fromBinary(MessageSchema, data);
        log('received', { peerKey: this._peerKey, payload: protocol.getPayloadType(message) });
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
  }

  private async _closeWebSocket() {
    if (!this._ws) {
      return;
    }
    this._ready.reset();
    // NOTE: Remove event handlers to avoid scheduling restart.
    this._ws.onclose = () => {};
    this._ws.close();
    this._ws = undefined;
  }

  /**
   * Send message.
   * NOTE: The message is guaranteed to be delivered but the service must respond with a message to confirm processing.
   */
  public async send(message: Message): Promise<void> {
    await this._ready.wait({ timeout: this._config.timeout ?? DEFAULT_TIMEOUT });
    invariant(this._ws);
    invariant(!message.source || message.source.peerKey === this._peerKey);
    log('sending...', { peerKey: this._peerKey, payload: protocol.getPayloadType(message) });
    this._ws.send(buf.toBinary(MessageSchema, message));
  }
}
