//
// Copyright 2020 DXOS.org
//

import { DeferredTask, Event, Trigger, asyncTimeout, scheduleTask, scheduleTaskInterval, sleep } from '@dxos/async';
import { type Any, type Stream } from '@dxos/codec-protobuf';
import { Context, cancelWithContext } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/protocols';
import { type Message as SignalMessage, SignalState, type SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { SignalRPCClient } from './signal-rpc-client';
import { type Message, type SignalClientMethods, type SignalStatus } from '../signal-methods';

const DEFAULT_RECONNECT_TIMEOUT = 100;
const MAX_RECONNECT_TIMEOUT = 5_000;
const ERROR_RECONCILE_DELAY = 1_000;
const RECONCILE_INTERVAL = 5_000;

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
 * KUBE-specific signaling client.
 * Establishes a websocket connection to signal server and provides RPC methods.
 */
// TODO(burdon): Rename impl.
export class SignalClient implements SignalClientMethods {
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

  private _client?: SignalRPCClient;
  private readonly _clientReady = new Trigger();

  private _ctx?: Context;

  private _connectionCtx?: Context;

  private _reconcileTask?: DeferredTask;
  private _reconnectTask?: DeferredTask;

  readonly statusChanged = new Event<SignalStatus>();
  readonly commandTrace = new Event<CommandTrace>();

  /**
   * Swarm events streams. Keys represent actually joined topic and peerId.
   */
  private readonly _swarmStreams = new ComplexMap<{ topic: PublicKey; peerId: PublicKey }, Stream<SwarmEvent>>(
    ({ topic, peerId }) => topic.toHex() + peerId.toHex(),
  );

  /**
   * Represent desired joined topic and peerId.
   */
  private readonly _joinedTopics = new ComplexSet<{ topic: PublicKey; peerId: PublicKey }>(
    ({ topic, peerId }) => topic.toHex() + peerId.toHex(),
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

  private readonly _performance = {
    sentMessages: 0,
    receivedMessages: 0,
    reconnectCounter: 0,
    joinCounter: 0,
    leaveCounter: 0,
  };

  /**
   * @param _host Signal server websocket URL.
   */
  constructor(
    private readonly _host: string,
    private readonly _onMessage: (params: { author: PublicKey; recipient: PublicKey; payload: Any }) => Promise<void>,
    private readonly _onSwarmEvent: (params: { topic: PublicKey; swarmEvent: SwarmEvent }) => Promise<void>,
    private readonly _getMetadata?: () => any,
  ) {
    if (!this._host.startsWith('wss://') && !this._host.startsWith('ws://')) {
      throw new Error(`Signal server requires a websocket URL. Provided: ${this._host}`);
    }
  }

  async open() {
    log.trace('dxos.mesh.signal-client.open', trace.begin({ id: this._instanceId }));

    if ([SignalState.CONNECTED, SignalState.CONNECTING].includes(this._state)) {
      return;
    }

    this._ctx = new Context({
      onError: (err) => {
        if (this._state === SignalState.CLOSED || this._ctx?.disposed) {
          return;
        }
        if (this._state === SignalState.CONNECTED) {
          log.warn('SignalClient error:', err);
        }
        this._scheduleReconcileAfterError();
      },
    });

    this._reconcileTask = new DeferredTask(this._ctx, async () => {
      await this._reconcileSwarmSubscriptions();
      await this._reconcileMessageSubscriptions();
      this._reconciled.emit();
    });

    // Reconcile subscriptions periodically.
    scheduleTaskInterval(
      this._ctx,
      async () => {
        if (this._state === SignalState.CONNECTED) {
          this._reconcileTask!.schedule();
        }
      },
      RECONCILE_INTERVAL,
    );

    this._reconnectTask = new DeferredTask(this._ctx, async () => {
      await this._reconnect();
    });

    this._setState(SignalState.CONNECTING);
    this._createClient();
    log.trace('dxos.mesh.signal-client.open', trace.end({ id: this._instanceId }));
  }

  async close() {
    log('closing...');
    if ([SignalState.CLOSED].includes(this._state)) {
      return;
    }

    await this._ctx?.dispose();

    this._clientReady.reset();
    await this._client?.close();
    this._client = undefined;
    this._setState(SignalState.CLOSED);
    log('closed');
  }

  getStatus(): SignalStatus {
    return {
      host: this._host,
      state: this._state,
      error: this._lastError?.message,
      reconnectIn: this._reconnectAfter,
      connectionStarted: this._connectionStarted,
      lastStateChange: this._lastStateChange,
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
    void this._swarmStreams.get({ topic, peerId })?.close();
    this._swarmStreams.delete({ topic, peerId });
    this._joinedTopics.delete({ topic, peerId });
  }

  async sendMessage(msg: Message): Promise<void> {
    this._performance.sentMessages++;
    await this._clientReady.wait();
    invariant(this._state === SignalState.CONNECTED, 'Not connected to Signal Server');
    await this._client!.sendMessage(msg);
  }

  async subscribeMessages(peerId: PublicKey) {
    log('subscribing to messages', { peerId });
    this._subscribedMessages.add({ peerId });
    this._reconcileTask!.schedule();
  }

  async unsubscribeMessages(peerId: PublicKey) {
    log('unsubscribing from messages', { peerId });
    this._subscribedMessages.delete({ peerId });
    void this._messageStreams.get(peerId)?.close();
    this._messageStreams.delete(peerId);
  }

  private _scheduleReconcileAfterError() {
    scheduleTask(
      this._ctx!,
      () => {
        this._reconcileTask!.schedule();
      },
      ERROR_RECONCILE_DELAY,
    );
  }

  private _setState(newState: SignalState) {
    this._state = newState;
    this._lastStateChange = new Date();
    log('signal state changed', { status: this.getStatus() });
    this.statusChanged.emit(this.getStatus());
  }

  private _createClient() {
    log('creating client', { host: this._host, state: this._state });
    invariant(!this._client, 'Client already created');

    this._connectionStarted = new Date();

    // Create new context for each connection.
    this._connectionCtx = this._ctx!.derive();
    this._connectionCtx.onDispose(async () => {
      log('connection context disposed');
      await Promise.all(Array.from(this._swarmStreams.values()).map((stream) => stream.close()));
      await Promise.all(Array.from(this._messageStreams.values()).map((stream) => stream.close()));
      this._swarmStreams.clear();
      this._messageStreams.clear();
    });

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
            if (this._state === SignalState.ERROR) {
              // Ignore disconnects after error.
              // Handled by error handler before disconnect handler.
              this._setState(SignalState.DISCONNECTED);
              return;
            }
            if (this._state !== SignalState.CONNECTED && this._state !== SignalState.CONNECTING) {
              this._incrementReconnectTimeout();
            }
            this._setState(SignalState.DISCONNECTED);
            this._reconnectTask!.schedule();
          },

          onError: (error) => {
            log('socket error', { error, state: this._state });
            this._lastError = error;
            if (this._state !== SignalState.CONNECTED && this._state !== SignalState.CONNECTING) {
              this._incrementReconnectTimeout();
            }
            this._setState(SignalState.ERROR);

            this._reconnectTask!.schedule();
          },
          getMetadata: this._getMetadata,
        },
      });
    } catch (err: any) {
      if (this._state !== SignalState.CONNECTED && this._state !== SignalState.CONNECTING) {
        this._incrementReconnectTimeout();
      }
      this._lastError = err;
      this._setState(SignalState.DISCONNECTED);
      this._reconnectTask!.schedule();
    }
  }

  private _incrementReconnectTimeout() {
    this._reconnectAfter *= 2;
    this._reconnectAfter = Math.min(this._reconnectAfter, MAX_RECONNECT_TIMEOUT);
  }

  private async _reconnect() {
    log(`reconnecting in ${this._reconnectAfter}ms`, { state: this._state });
    this._performance.reconnectCounter++;

    if (this._state === SignalState.RECONNECTING) {
      log.warn('Signal api already reconnecting.');
      return;
    }

    if (this._state === SignalState.CLOSED) {
      return;
    }

    // Close client if it wasn't already closed.
    this._clientReady.reset();
    await this._connectionCtx?.dispose();
    this._client?.close().catch(() => {});
    this._client = undefined;

    await cancelWithContext(this._ctx!, sleep(this._reconnectAfter));

    this._setState(SignalState.RECONNECTING);

    this._createClient();
  }

  private async _reconcileSwarmSubscriptions(): Promise<void> {
    await asyncTimeout(cancelWithContext(this._connectionCtx!, this._clientReady.wait()), 5_000);
    // Copy Client reference to avoid client change during the reconcile.
    const client = this._client!;
    invariant(this._state === SignalState.CONNECTED, 'Not connected to Signal Server');

    // Unsubscribe from topics that are no longer needed.
    for (const { topic, peerId } of this._swarmStreams.keys()) {
      // Join desired topics.
      if (this._joinedTopics.has({ topic, peerId })) {
        continue;
      }

      void this._swarmStreams.get({ topic, peerId })?.close();
      this._swarmStreams.delete({ topic, peerId });
    }

    // Subscribe to topics that are needed.
    for (const { topic, peerId } of this._joinedTopics.values()) {
      // Join desired topics.
      if (this._swarmStreams.has({ topic, peerId })) {
        continue;
      }

      const swarmStream = await asyncTimeout(
        cancelWithContext(this._connectionCtx!, client.join({ topic, peerId })),
        5_000,
      );
      // Subscribing to swarm events.
      // TODO(mykola): What happens when the swarm stream is closed? Maybe send leave event for each peer?
      swarmStream.subscribe(async (swarmEvent: SwarmEvent) => {
        log('swarm event', { swarmEvent });
        await this._onSwarmEvent({ topic, swarmEvent });
      });

      // Saving swarm stream.
      this._swarmStreams.set({ topic, peerId }, swarmStream);
    }
  }

  private async _reconcileMessageSubscriptions(): Promise<void> {
    await asyncTimeout(cancelWithContext(this._connectionCtx!, this._clientReady.wait()), 5_000);
    // Copy Client reference to avoid client change during the reconcile.
    const client = this._client!;
    invariant(this._state === SignalState.CONNECTED, 'Not connected to Signal Server');

    // Unsubscribe from messages that are no longer needed.
    for (const peerId of this._messageStreams.keys()) {
      // Join desired topics.
      if (this._subscribedMessages.has({ peerId })) {
        continue;
      }

      void this._messageStreams.get(peerId)?.close();
      this._messageStreams.delete(peerId);
    }

    // Subscribe to messages that are needed.
    for (const { peerId } of this._subscribedMessages.values()) {
      if (this._messageStreams.has(peerId)) {
        continue;
      }

      const messageStream = await asyncTimeout(
        cancelWithContext(this._connectionCtx!, client.receiveMessages(peerId)),
        5_000,
      );
      messageStream.subscribe(async (message: SignalMessage) => {
        this._performance.receivedMessages++;
        await this._onMessage({
          author: PublicKey.from(message.author),
          recipient: PublicKey.from(message.recipient),
          payload: message.payload,
        });
      });

      // Saving message stream.
      this._messageStreams.set(peerId, messageStream);
    }
  }
}
