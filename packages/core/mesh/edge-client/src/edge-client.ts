//
// Copyright 2024 DXOS.org
//

import WebSocket from 'isomorphic-ws';
import pify from 'pify';

import { Trigger, Event, scheduleTaskInterval, scheduleTask, TriggerState } from '@dxos/async';
import { Context, LifecycleState, Resource, type Lifecycle } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { type Message, MessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from './defs';
import { WebsocketClosedError } from './errors';
import { PersistentLifecycle } from './persistent-lifecycle';
import { type Protocol, toUint8Array } from './protocol';

const DEFAULT_TIMEOUT = 10_000;
const SIGNAL_KEEPALIVE_INTERVAL = 5_000;

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
  private _keepaliveCtx?: Context = undefined;
  private _heartBeatContext?: Context = undefined;

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
    await this._persistentLifecycle.open();
  }

  /**
   * Close connection and free resources.
   */
  protected override async _close() {
    log('closing...', { peerKey: this._peerKey });
    await this._persistentLifecycle.close();
  }

  private async _openWebSocket() {
    const url = new URL(`/ws/${this._identityKey}/${this._peerKey}`, this._config.socketEndpoint);
    this._ws = new WebSocket(url);

    this._ws.onopen = () => {
      log('opened', this.info);
      this._ready.wake();
    };
    this._ws.onclose = () => {
      log('closed', this.info);
      this._persistentLifecycle.scheduleRestart();
    };
    this._ws.onerror = (event) => {
      log.warn('EdgeClient socket error', { error: event.error, info: event.message });
      this._persistentLifecycle.scheduleRestart();
    };
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent/data
     */
    this._ws.onmessage = async (event) => {
      if (event.data === '__pong__') {
        this._onHeartbeat();
        return;
      }
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
    };

    await this._ready.wait({ timeout: this._config.timeout ?? DEFAULT_TIMEOUT });
    this._keepaliveCtx = new Context();
    scheduleTaskInterval(
      this._keepaliveCtx,
      async () => {
        // TODO(mykola): use RFC6455 ping/pong once implemented in the browser?
        // Cloudflare's worker responds to this `without interrupting hibernation`. https://developers.cloudflare.com/durable-objects/api/websockets/#setwebsocketautoresponse
        this._ws?.send('__ping__');
      },
      SIGNAL_KEEPALIVE_INTERVAL,
    );
    this._ws.send('__ping__');
    this._onHeartbeat();
  }

  private async _closeWebSocket() {
    if (!this._ws) {
      return;
    }
    try {
      this._ready.throw(new WebsocketClosedError());
      this._ready.reset();
      void this._keepaliveCtx?.dispose();
      this._keepaliveCtx = undefined;
      void this._heartBeatContext?.dispose();
      this._heartBeatContext = undefined;

      // NOTE: Remove event handlers to avoid scheduling restart.
      this._ws.onopen = () => {};
      this._ws.onclose = () => {};
      this._ws.onerror = () => {};
      this._ws.close();
      this._ws = undefined;
    } catch (err) {
      if (err instanceof Error && err.message.includes('WebSocket is closed before the connection is established.')) {
        return;
      }
      log.warn('Error closing websocket', { err });
    }
  }

  /**
   * Send message.
   * NOTE: The message is guaranteed to be delivered but the service must respond with a message to confirm processing.
   */
  public async send(message: Message): Promise<void> {
    if (this._ready.state !== TriggerState.RESOLVED) {
      await this._ready.wait({ timeout: this._config.timeout ?? DEFAULT_TIMEOUT });
    }
    invariant(this._ws);
    invariant(!message.source || message.source.peerKey === this._peerKey);
    log('sending...', { peerKey: this._peerKey, payload: protocol.getPayloadType(message) });
    await pify((binary: Uint8Array, callback: (err?: Error) => void) => this._ws?.send(binary, callback))(
      buf.toBinary(MessageSchema, message),
    );
  }

  private _onHeartbeat() {
    if (this._lifecycleState !== LifecycleState.OPEN) {
      return;
    }
    void this._heartBeatContext?.dispose();
    this._heartBeatContext = new Context();
    scheduleTask(
      this._heartBeatContext,
      () => {
        this._persistentLifecycle.scheduleRestart();
      },
      2 * SIGNAL_KEEPALIVE_INTERVAL,
    );
  }
}
