//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { DeferredTask, Event, Trigger, scheduleTask, synchronized } from '@dxos/async';
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

  private _connectionContext?: Context;

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

  private readonly _messageStreams = new ComplexMap<PublicKey, Stream<SignalMessage>>((key) => key.toHex());
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
    this._ctx = new Context({
      onError: (err) => {
        log.catch(err);
        this._scheduleReconcileAfterError();
      }
    });
    this._connectionContext = this._ctx.derive();
    this._reconcileTask = new DeferredTask(this._ctx, async () => {
      for (const { topic, peerId } of this._joinedTopics.values()) {
        if (this._swarmStreams.has({ topic, peerId })) {
          continue;
        }
        await this._clientReady.wait();
        assert(this._state === SignalState.CONNECTED, 'Not connected to Signal Server');
        await this._subscribeSwarmEvents({ topic, peerId });
      }
    });
    log.trace('dxos.mesh.signal-client', trace.begin({ id: this._instanceId, parentId: this._traceParent }));

    if ([SignalState.CONNECTED, SignalState.CONNECTING].includes(this._state)) {
      return;
    }

    this._setState(SignalState.CONNECTING);
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
    await this._clientReady.wait();
    assert(this._state === SignalState.CONNECTED, 'Not connected to Signal Server');

    // Do nothing if already subscribed.
    if (this._messageStreams.has(peerId)) {
      // TODO(mykola): on multiple subscription for same peerId, everybody will receive same unsubscribe handle.
      return {
        unsubscribe: async () => {
          this._messageStreams.get(peerId)!.close();
          this._messageStreams.delete(peerId);
        }
      };
    }

    // Subscribing to messages.
    const messageStream = await this._client.receiveMessages(peerId);
    messageStream.subscribe(async (message: SignalMessage) => {
      this._performance.receivedMessages++;
      await this._onMessage({
        author: PublicKey.from(message.author),
        recipient: PublicKey.from(message.recipient),
        payload: message.payload
      });
    });

    // Saving message stream.
    if (!this._messageStreams.has(peerId)) {
      this._messageStreams.set(peerId, messageStream);
    }

    this._connectionContext!.onDispose(() => {
      messageStream.close();
      this._messageStreams.delete(peerId);
    });

    return {
      unsubscribe: async () => {
        messageStream.close();
        this._messageStreams.delete(peerId);
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

  private _createClient() {
    log('creating client', { host: this._host });
    this._connectionContext = this._ctx!.derive();
    this._connectionStarted = new Date();
    try {
      this._client = new SignalRPCClient(this._host);
    } catch (err: any) {
      if (this._state === SignalState.RE_CONNECTING) {
        this._incrementReconnectTimeout();
      }

      // TODO(burdon): If client isn't set, then flows through to error below.
      this._lastError = err;
      this._setState(SignalState.DISCONNECTED);
      this._reconnect();
    }

    this._client.connected.on(this._connectionContext, () => {
      log('socket connected');
      this._lastError = undefined;
      this._reconnectAfter = DEFAULT_RECONNECT_TIMEOUT;
      this._setState(SignalState.CONNECTED);
      this._clientReady.wake();
      this._reconcileTask!.schedule();
    });

    this._client.error.on(this._connectionContext, (error) => {
      log('socket error', { error });
      if (this._state === SignalState.CLOSED) {
        return;
      }

      if (this._state === SignalState.RE_CONNECTING) {
        this._incrementReconnectTimeout();
      }

      this._lastError = error;
      this._setState(SignalState.DISCONNECTED);
      this._reconnect();
    });

    this._client.disconnected.on(this._connectionContext, () => {
      log('socket disconnected');
      // This is also called in case of error, but we already have disconnected the socket on error, so no need to do anything here.
      if (this._state !== SignalState.CONNECTING && this._state !== SignalState.RE_CONNECTING) {
        return;
      }

      if (this._state === SignalState.RE_CONNECTING) {
        this._incrementReconnectTimeout();
      }

      this._setState(SignalState.DISCONNECTED);
      this._reconnect();
    });
  }

  private _incrementReconnectTimeout() {
    this._reconnectAfter *= 2;
    this._reconnectAfter = Math.min(this._reconnectAfter, MAX_RECONNECT_TIMEOUT);
  }

  private _reconnect() {
    this._performance.reconnectCounter++;
    log(`reconnecting in ${this._reconnectAfter}ms`);
    if (this._state === SignalState.RE_CONNECTING) {
      console.error('Signal api already reconnecting.');
      return;
    }
    if (this._state === SignalState.CLOSED) {
      return;
    }

    this._setState(SignalState.RE_CONNECTING);
    void this._connectionContext?.dispose();

    scheduleTask(
      this._ctx!,
      async () => {
        // Close client if it wasn't already closed.
        this._client.close().catch(() => {});
        this._createClient();
      },
      this._reconnectAfter
    );
  }

  @synchronized
  private async _subscribeSwarmEvents({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }): Promise<void> {
    assert(!this._swarmStreams.has({ topic, peerId }), 'Already subscribed to swarm events.');
    const swarmStream = await this._client.join({ topic, peerId });

    // Subscribing to swarm events.
    // TODO(mykola): What happens when the swarm stream is closed? Maybe send leave event for each peer?
    swarmStream.subscribe((swarmEvent: SwarmEvent) => {
      log('swarm event', { swarmEvent });
      this.swarmEvent.emit({ topic, swarmEvent });
    });

    // Saving swarm stream.
    this._swarmStreams.set({ topic, peerId }, swarmStream);
    this._connectionContext!.onDispose(() => {
      swarmStream.close();
      this._swarmStreams.delete({ topic, peerId });
    });
  }
}
