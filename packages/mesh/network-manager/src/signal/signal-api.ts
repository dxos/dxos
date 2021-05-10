//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import { SignalData } from 'simple-peer';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';

import { WebsocketRpc } from './websocket-rpc';

const log = debug('dxos:network-manager:signal-api');

const DEFAULT_RECONNECT_TIMEOUT = 1000;

/**
 * Establishes a websocket connection to signal server and provides RPC methods.
 */
export class SignalApi {
  private _state = SignalApi.State.CONNECTING;

  private _lastError?: Error;

  /**
   * Number of milliseconds after which the connection will be attempted again in case of error.
   */
  private _reconnectAfter = DEFAULT_RECONNECT_TIMEOUT;

  /**
   * Timestamp of when the connection attempt was began.
   */
  private _connectionStarted = Date.now();

  /**
   * Timestamp of last state change.
   */
  private _lastStateChange = Date.now();

  private _reconnectIntervalId?: NodeJS.Timeout;

  private _client!: WebsocketRpc;

  private _clientCleanup: (() => void)[] = [];

  readonly statusChanged = new Event<SignalApi.Status>();

  readonly commandTrace = new Event<SignalApi.CommandTrace>();

  /**
   * @param _host Signal server websocket URL.
   * @param _onOffer See `SignalApi.offer`.
   * @param _onSignal See `SignalApi.signal`.
   */
  constructor (
    private readonly _host: string,
    private readonly _onOffer: (message: SignalApi.SignalMessage) => Promise<SignalApi.Answer>,
    private readonly _onSignal: (message: SignalApi.SignalMessage) => Promise<void>
  ) {
    this._setState(SignalApi.State.CONNECTING);
    this._createClient();
  }

  private _setState (newState: SignalApi.State) {
    this._state = newState;
    this._lastStateChange = Date.now();
    log(`Signal state changed ${JSON.stringify(this.getStatus())}`);
    this.statusChanged.emit(this.getStatus());
  }

  private _createClient () {
    this._connectionStarted = Date.now();
    try {
      this._client = new WebsocketRpc(this._host);
    } catch (error) {
      if (this._state === SignalApi.State.RE_CONNECTING) {
        this._reconnectAfter *= 2;
      }

      this._lastError = error;
      this._setState(SignalApi.State.DISCONNECTED);

      this._reconnect();
    }
    this._client.addHandler('offer', (message: any) => this._onOffer({
      id: PublicKey.from(message.id),
      remoteId: PublicKey.from(message.remoteId),
      topic: PublicKey.from(message.topic),
      sessionId: PublicKey.from(message.sessionId),
      data: message.data
    }));
    this._client.subscribe('signal', (msg: SignalApi.SignalMessage) => this._onSignal({
      id: PublicKey.from(msg.id),
      remoteId: PublicKey.from(msg.remoteId),
      topic: PublicKey.from(msg.topic),
      sessionId: PublicKey.from(msg.sessionId),
      data: msg.data
    }));

    this._clientCleanup.push(this._client.connected.on(() => {
      log('Socket connected');
      this._lastError = undefined;
      this._reconnectAfter = DEFAULT_RECONNECT_TIMEOUT;
      this._setState(SignalApi.State.CONNECTED);
    }));
    this._clientCleanup.push(this._client.error.on(error => {
      log(`Socket error: ${error.message}`);
      if (this._state === SignalApi.State.CLOSED) {
        return;
      }

      if (this._state === SignalApi.State.RE_CONNECTING) {
        this._reconnectAfter *= 2;
      }

      this._lastError = error;
      this._setState(SignalApi.State.DISCONNECTED);

      this._reconnect();
    }));
    this._clientCleanup.push(this._client.disconnected.on(() => {
      log('Socket disconnected');
      // This is also called in case of error, but we already have disconnected the socket on error, so no need to do anything here.
      if (this._state !== SignalApi.State.CONNECTING && this._state !== SignalApi.State.RE_CONNECTING) {
        return;
      }

      if (this._state === SignalApi.State.RE_CONNECTING) {
        this._reconnectAfter *= 2;
      }

      this._setState(SignalApi.State.DISCONNECTED);

      this._reconnect();
    }));
    this._clientCleanup.push(this._client.commandTrace.on(trace => this.commandTrace.emit(trace)));
  }

  private _reconnect () {
    if (this._reconnectIntervalId !== undefined) {
      console.error('Signal api already reconnecting.');
      return;
    }

    this._reconnectIntervalId = setTimeout(() => {
      this._reconnectIntervalId = undefined;

      this._clientCleanup.forEach(cb => cb());
      this._clientCleanup = [];

      // Close client if it wasn't already closed.
      this._client.close().catch(() => {});

      this._setState(SignalApi.State.RE_CONNECTING);
      this._createClient();
    }, this._reconnectAfter);
  }

  async close () {
    this._clientCleanup.forEach(cb => cb());
    this._clientCleanup = [];

    if (this._reconnectIntervalId !== undefined) {
      clearTimeout(this._reconnectIntervalId);
    }

    await this._client.close();
    this._setState(SignalApi.State.CLOSED);
  }

  getStatus (): SignalApi.Status {
    return {
      host: this._host,
      state: this._state,
      error: this._lastError?.message,
      reconnectIn: this._reconnectAfter,
      connectionStarted: this._connectionStarted,
      lastStateChange: this._lastStateChange
    };
  }

  async join (topic: PublicKey, peerId: PublicKey): Promise<PublicKey[]> {
    const peers: Buffer[] = await this._client.call('join', {
      id: peerId.asBuffer(),
      topic: topic.asBuffer()
    });
    return peers.map(id => PublicKey.from(id));
  }

  async leave (topic: PublicKey, peerId: PublicKey): Promise<void> {
    await this._client.call('leave', {
      id: peerId.asBuffer(),
      topic: topic.asBuffer()
    });
  }

  async lookup (topic: PublicKey): Promise<PublicKey[]> {
    const peers: Buffer[] = await this._client.call('lookup', {
      topic: topic.asBuffer()
    });
    return peers.map(id => PublicKey.from(id));
  }

  /**
   * Routes an offer to the other peer's _onOffer callback.
   * @returns Other peer's _onOffer callback return value.
   */
  async offer (payload: SignalApi.SignalMessage): Promise<SignalApi.Answer> {
    return this._client.call('offer', {
      id: payload.id.asBuffer(),
      remoteId: payload.remoteId.asBuffer(),
      topic: payload.topic.asBuffer(),
      sessionId: payload.sessionId.asBuffer(),
      data: payload.data
    });
  }

  /**
   * Routes an offer to the other peer's _onSignal callback.
   */
  async signal (payload: SignalApi.SignalMessage): Promise<void> {
    return this._client.emit('signal', {
      id: payload.id.asBuffer(),
      remoteId: payload.remoteId.asBuffer(),
      topic: payload.topic.asBuffer(),
      sessionId: payload.sessionId.asBuffer(),
      data: payload.data
    });
  }
}

export namespace SignalApi {
  export enum State {
    /** Connection is being established. */
    CONNECTING = 'CONNECTING',

    /** Connection is being re-established. */
    RE_CONNECTING = 'RE_CONNECTING',

    /** Connected. */
    CONNECTED = 'CONNECTED',

    /** Server terminated the connection. Socket will be reconnected. */
    DISCONNECTED = 'DISCONNECTED',

    /** Socket was closed. */
    CLOSED = 'CLOSED',
  }

  export interface Status {
    host: string,
    state: State,
    error?: string
    reconnectIn: number,
    connectionStarted: number
    lastStateChange: number
  }

  export interface CommandTrace {
    messageId: string
    host: string
    incoming: boolean
    time: number
    method: string
    payload: any
    response?: any
    error?: string
  }

  // TODO(marik-d): Define more concrete types for offer/answer.
  export interface SignalMessage {
    id: PublicKey
    remoteId: PublicKey,
    topic: PublicKey,
    sessionId: PublicKey,
    data: SignalData,
  }

  export interface Answer {
    accept: boolean
  }
}
