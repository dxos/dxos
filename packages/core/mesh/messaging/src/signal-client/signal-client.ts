//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { DeferredTask, Event, Trigger, asyncTimeout, scheduleTask } from '@dxos/async';
import { Any, Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/protocols';
import { Message as SignalMessage, SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { Message, SignalMethods } from '../signal-methods';
import { SignalRPCClient } from './signal-rpc-client';

const DEFAULT_RECONNECT_TIMEOUT = 100;
const MAX_RECONNECT_TIMEOUT = 5000;
const ERROR_RECONCILE_DELAY = 1000;

export enum SignalState {
  /** Connection is being established. */
  CONNECTING = 'CONNECTING',

  /** Connection is being re-established. */
  RE_CONNECTING = 'RE_CONNECTING',

  /** Connected. */
  CONNECTED = 'CONNECTED',

  /** Server terminated the connection. Socket will be reconnected. */
  DISCONNECTED = 'DISCONNECTED',

  /** Socket was closed. */
  CLOSED = 'CLOSED'
}

export type SignalStatus = {
  host: string;
  state: SignalState;
  error?: string;
  reconnectIn: number;
  connectionStarted: Date;
  lastStateChange: Date;
};

export type CommandTrace = {
  messageId: string;
  host: string;
  incoming: boolean;
  time: number;
  method: string;
  payload: any;
  response?: any;
  error?: string;
};

/**
 * Establishes a websocket connection to signal server and provides RPC methods.
 */
export class SignalClient implements SignalMethods {
  private _state = SignalState.CLOSED;

  private _lastError?: Error;

  /**
   * Number of milliseconds after which the connection will be attempted again in case of error.
   */
  private _reconnectAfter = DEFAULT_RECONNECT_TIMEOUT;

  /**
   * Timestamp of when the connection attempt was began.
   */
  private _connectionStarted = new Date();

  /**
   * Timestamp of last state change.
   */
  private _lastStateChange = new Date();

  private _client!: SignalRPCClient;
  private readonly _clientReady = new Trigger();

  private _ctx?: Context;

  private _connectionCtx?: Context;

  private _reconcileTask?: DeferredTask;

  readonly statusChanged = new Event<SignalStatus>();
  readonly commandTrace = new Event<CommandTrace>();
  readonly swarmEvent = new Event<{
    topic: PublicKey;
    swarmEvent: SwarmEvent;
  }>();

  /**
   * Swarm events streams. Keys represent actually joined topic and peerId.
   */
  private readonly _swarmStreams = new ComplexMap<{ topic: PublicKey; peerId: PublicKey }, Stream<SwarmEvent>>(
    ({ topic, peerId }) => topic.toHex() + peerId.toHex()
  );

  /**
   * Represent desired joined topic and peerId.
   */
  private readonly _joinedTopics = new ComplexSet<{ topic: PublicKey; peerId: PublicKey }>(
    ({ topic, peerId }) => topic.toHex() + peerId.toHex()
  );

  /**
   * Message streams. Keys represents actually subscribed peers.
   * @internal
   */
  public readonly _messageStreams = new ComplexMap<PublicKey, Stream<SignalMessage>>((key) => key.toHex());

  /**
   * Represent desired message subscriptions.
   */
  private readonly _subscribedMessages = new ComplexSet<{ peerId: PublicKey }>(({ peerId }) => peerId.toHex());

  /**
   * Event to use in tests to wait till subscription is successfully established.
   * @internal
   */
  public _reconciled = new Event();

  private readonly _instanceId = PublicKey.random().toHex();
  public _traceParent?: string;

  private readonly _performance = {
    sentMessages: 0,
    receivedMessages: 0,
    reconnectCounter: 0,
    joinCounter: 0,
    leaveCounter: 0
  };

  /**
   * @param _host Signal server websocket URL.
   * @param _onMessage
   */
  constructor(
    private readonly _host: string,
    private readonly _onMessage: (params: { author: PublicKey; recipient: PublicKey; payload: Any }) => Promise<void>
  ) {}

  open() {
    log.trace('dxos.mesh.signal-client', trace.begin({ id: this._instanceId, parentId: this._traceParent }));
    this._ctx = new Context({
      onError: (err) => {
        log.warn('Signal Client Error', err);
        this._scheduleReconcileAfterError();
      }
    });
    this._reconcileTask = new DeferredTask(this._ctx, async () => {
      await this._reconcileSwarmSubscriptions();
      await this._reconcileMessageSubscriptions();
      this._reconciled.emit();
    });

    if ([SignalState.CONNECTED, SignalState.CONNECTING].includes(this._state)) {
      return;
    }

    this._setState(SignalState.CONNECTING);
    this._initConnectionCtx();
    this._createClient();
  }

  async close() {
    log('closing...');
    if ([SignalState.CLOSED].includes(this._state)) {
      return;
    }

    await this._ctx?.dispose();

    this._clientReady.reset();
    await this._client.close();
    this._setState(SignalState.CLOSED);
    log('closed');
    log.trace('dxos.mesh.signal-client', trace.end({ id: this._instanceId, data: { performance: this._performance } }));
  }

  getStatus(): SignalStatus {
    return {
      host: this._host,
      state: this._state,
      error: this._lastError?.message,
      reconnectIn: this._reconnectAfter,
      connectionStarted: this._connectionStarted,
      lastStateChange: this._lastStateChange
    };
  }

  async join({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }): Promise<void> {
    log('joining', { topic, peerId });
    this._performance.joinCounter++;
    this._joinedTopics.add({ topic, peerId });
    this._reconcileTask!.schedule();
  }

  async leave({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }): Promise<void> {
    this._performance.leaveCounter++;
    log('leaving', { topic, peerId });

    this._swarmStreams.get({ topic, peerId })?.close();
    this._swarmStreams.delete({ topic, peerId });
    this._joinedTopics.delete({ topic, peerId });
  }

  async sendMessage(msg: Message): Promise<void> {
    this._performance.sentMessages++;
    await this._clientReady.wait();
    assert(this._state === SignalState.CONNECTED, 'Not connected to Signal Server');
    await this._client.sendMessage(msg);
  }

  async subscribeMessages(peerId: PublicKey) {
    log('subscribing to messages', { peerId });
    this._subscribedMessages.add({ peerId });
    this._reconcileTask!.schedule();

    return {
      unsubscribe: async () => {
        this._messageStreams.get(peerId)!.close();
        this._messageStreams.delete(peerId);
        this._subscribedMessages.delete({ peerId });
      }
    };
  }

  private _scheduleReconcileAfterError() {
    scheduleTask(
      this._ctx!,
      () => {
        this._reconcileTask!.schedule();
      },
      ERROR_RECONCILE_DELAY
    );
  }

  private _setState(newState: SignalState) {
    this._state = newState;
    this._lastStateChange = new Date();
    log('signal state changed', { status: this.getStatus() });
    this.statusChanged.emit(this.getStatus());
  }

  private _initConnectionCtx() {
    void this._connectionCtx?.dispose();
    this._connectionCtx = this._ctx!.derive();
    this._connectionCtx.onDispose(() => {
      log('connection context disposed');
      Array.from(this._swarmStreams.values()).forEach((stream) => stream.close());
      Array.from(this._messageStreams.values()).forEach((stream) => stream.close());
      this._swarmStreams.clear();
      this._messageStreams.clear();
    });
  }

  private _createClient() {
    log('creating client', { host: this._host, state: this._state });

    this._connectionStarted = new Date();
    try {
      this._client = new SignalRPCClient({
        url: this._host,
        callbacks: {
          onConnected: () => {
            log('socket connected');
            this._lastError = undefined;
            this._reconnectAfter = DEFAULT_RECONNECT_TIMEOUT;
            this._setState(SignalState.CONNECTED);
            this._clientReady.wake();
            this._reconcileTask!.schedule();
          },

          onDisconnected: () => {
            log('socket disconnected', { state: this._state });
            if (this._state !== SignalState.CONNECTED && this._state !== SignalState.CONNECTING) {
              this._incrementReconnectTimeout();
            }
            this._setState(SignalState.DISCONNECTED);
            this._reconnect();
          },

          onError: (error) => {
            log('socket error', { error, state: this._state });
            if (this._state !== SignalState.CONNECTED && this._state !== SignalState.CONNECTING) {
              this._incrementReconnectTimeout();
            }

            this._lastError = error;
            this._setState(SignalState.DISCONNECTED);
            this._reconnect();
          }
        }
      });
    } catch (err: any) {
      if (this._state === SignalState.RE_CONNECTING) {
        this._incrementReconnectTimeout();
      }

      // TODO(burdon): If client isn't set, then flows through to error below.
      this._lastError = err;
      this._setState(SignalState.DISCONNECTED);
      this._reconnect();
    }
  }

  private _incrementReconnectTimeout() {
    this._reconnectAfter *= 2;
    this._reconnectAfter = Math.min(this._reconnectAfter, MAX_RECONNECT_TIMEOUT);
  }

  private _reconnect() {
    this._performance.reconnectCounter++;
    log(`reconnecting in ${this._reconnectAfter}ms`, { state: this._state });
    if (this._state === SignalState.CLOSED) {
      return;
    }

    if (this._state === SignalState.RE_CONNECTING) {
      log.warn('Signal api already reconnecting.');
      return;
    }

    this._setState(SignalState.RE_CONNECTING);
    this._initConnectionCtx();

    scheduleTask(
      this._connectionCtx!,
      async () => {
        log('Reconnect task', { state: this._state });
        // Close client if it wasn't already closed.
        this._clientReady.reset();
        this._client.close().catch(() => {});
        this._createClient();
      },
      this._reconnectAfter
    );
  }

  private async _reconcileSwarmSubscriptions(): Promise<void> {
    await asyncTimeout(this._clientReady.wait(), 1000);
    // Copy Client reference to avoid client change during the reconcile.
    const client = this._client;
    assert(this._state === SignalState.CONNECTED, 'Not connected to Signal Server');

    // Unsubscribe from topics that are no longer needed.
    for (const { topic, peerId } of this._swarmStreams.keys()) {
      // Join desired topics.
      if (this._joinedTopics.has({ topic, peerId })) {
        continue;
      }

      this._swarmStreams.get({ topic, peerId })?.close();
      this._swarmStreams.delete({ topic, peerId });
    }

    // Subscribe to topics that are needed.
    for (const { topic, peerId } of this._joinedTopics.values()) {
      // Join desired topics.
      if (this._swarmStreams.has({ topic, peerId })) {
        continue;
      }

      const swarmStream = await client.join({ topic, peerId });
      // Subscribing to swarm events.
      // TODO(mykola): What happens when the swarm stream is closed? Maybe send leave event for each peer?
      swarmStream.subscribe((swarmEvent: SwarmEvent) => {
        log('swarm event', { swarmEvent });
        this.swarmEvent.emit({ topic, swarmEvent });
      });

      // Saving swarm stream.
      this._swarmStreams.set({ topic, peerId }, swarmStream);
    }
  }

  private async _reconcileMessageSubscriptions(): Promise<void> {
    await asyncTimeout(this._clientReady.wait(), 1000);
    // Copy Client reference to avoid client change during the reconcile.
    const client = this._client;
    assert(this._state === SignalState.CONNECTED, 'Not connected to Signal Server');

    // Unsubscribe from messages that are no longer needed.
    for (const peerId of this._messageStreams.keys()) {
      // Join desired topics.
      if (this._subscribedMessages.has({ peerId })) {
        continue;
      }

      this._messageStreams.get(peerId)?.close();
      this._messageStreams.delete(peerId);
    }

    // Subscribe to messages that are needed.
    for (const { peerId } of this._subscribedMessages.values()) {
      if (this._messageStreams.has(peerId)) {
        continue;
      }

      const messageStream = await client.receiveMessages(peerId);
      messageStream.subscribe(async (message: SignalMessage) => {
        this._performance.receivedMessages++;
        await this._onMessage({
          author: PublicKey.from(message.author),
          recipient: PublicKey.from(message.recipient),
          payload: message.payload
        });
      });

      // Saving message stream.
      this._messageStreams.set(peerId, messageStream);
    }
  }
}
