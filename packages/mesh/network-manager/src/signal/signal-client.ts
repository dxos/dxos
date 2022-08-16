//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event, synchronized } from '@dxos/async';
import { Any, Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/protocols';
import { ComplexMap, SubscriptionGroup } from '@dxos/util';

import { schema } from '../proto/gen';
import { Message, SwarmEvent } from '../proto/gen/dxos/mesh/signal';
import { SignalMessage } from '../proto/gen/dxos/mesh/signalMessage';
import { SignalApi } from './signal-api';
import { SignalRPCClient } from './signal-rpc-client';

const log = debug('dxos:network-manager:signal-client');

const DEFAULT_RECONNECT_TIMEOUT = 1000;

enum State {
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

export type Status = {
  host: string
  state: State
  error?: string
  reconnectIn: number
  connectionStarted: number
  lastStateChange: number
}

/**
 * Establishes a websocket connection to signal server and provides RPC methods.
 */
export class SignalClient {
  private _state = State.CONNECTING;

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

  private _client!: SignalRPCClient;

  private _cleanupSubscriptions = new SubscriptionGroup();
  readonly statusChanged = new Event<Status>();

  readonly commandTrace = new Event<SignalApi.CommandTrace>();
  readonly swarmEvent = new Event<[topic: PublicKey, swarmEvent: SwarmEvent]>();

  private readonly _swarmStreams = new ComplexMap<PublicKey, Stream<SwarmEvent>>(key => key.toHex());
  private readonly _messageStreams = new ComplexMap<PublicKey, Stream<Message>>(key => key.toHex());
  /**
   * @param _host Signal server websocket URL.
   * @param _onSignal See `SignalApi.signal`.
   */
  constructor (
    private readonly _host: string,
    private readonly _onSignal: (message: SignalMessage) => Promise<void>
  ) {
    this._setState(State.CONNECTING);
    this._createClient();
  }

  private _setState (newState: State) {
    this._state = newState;
    this._lastStateChange = Date.now();
    log(`Signal state changed ${JSON.stringify(this.getStatus())}`);
    this.statusChanged.emit(this.getStatus());
  }

  private _createClient () {
    this._connectionStarted = Date.now();
    try {
      this._client = new SignalRPCClient(this._host);
    } catch (error: any) {
      if (this._state === State.RE_CONNECTING) {
        this._reconnectAfter *= 2;
      }

      this._lastError = error;
      this._setState(State.DISCONNECTED);
      this._reconnect();
    }

    this._cleanupSubscriptions.push(this._client.connected.on(() => {
      this._lastError = undefined;
      this._reconnectAfter = DEFAULT_RECONNECT_TIMEOUT;
      this._setState(State.CONNECTED);
    }));

    this._cleanupSubscriptions.push(this._client.error.on(error => {
      log(`Socket error: ${error.message}`);
      if (this._state === State.CLOSED) {
        return;
      }

      if (this._state === State.RE_CONNECTING) {
        this._reconnectAfter *= 2;
      }

      this._lastError = error;
      this._setState(State.DISCONNECTED);

      this._reconnect();
    }));

    this._cleanupSubscriptions.push(this._client.disconnected.on(() => {
      log('Socket disconnected');
      // This is also called in case of error, but we already have disconnected the socket on error, so no need to do anything here.
      if (this._state !== State.CONNECTING && this._state !== State.RE_CONNECTING) {
        return;
      }

      if (this._state === State.RE_CONNECTING) {
        this._reconnectAfter *= 2;
      }

      this._setState(State.DISCONNECTED);
      this._reconnect();
    }));
  }

  private _reconnect () {
    log(`Reconnecting in ${this._reconnectAfter}ms`);
    if (this._reconnectIntervalId !== undefined) {
      console.error('Signal api already reconnecting.');
      return;
    }
    if (this._state === State.CLOSED) {
      return;
    }

    this._reconnectIntervalId = setTimeout(() => {
      this._reconnectIntervalId = undefined;

      this._cleanupSubscriptions.unsubscribe();

      // Close client if it wasn't already closed.
      this._client.close().catch(() => {});

      this._setState(State.RE_CONNECTING);
      this._createClient();
    }, this._reconnectAfter);
  }

  async close () {
    this._cleanupSubscriptions.unsubscribe();

    if (this._reconnectIntervalId !== undefined) {
      clearTimeout(this._reconnectIntervalId);
    }

    await this._client.close();
    this._setState(State.CLOSED);
    log('Closed.');
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

  async join (topic: PublicKey, peerId: PublicKey): Promise<void> {
    log(`Join: topic=${topic} peerId=${peerId}`);
    await this._subscribeMessages(peerId);
    await this._subscribeSwarmEvents(topic, peerId);
  }

  async leave (topic: PublicKey, peerId: PublicKey): Promise<void> {
    log(`Leave: topic=${topic} peerId=${peerId}`);

    this._swarmStreams.get(topic)?.close();
    this._swarmStreams.delete(topic);

    this._messageStreams.get(topic)?.close();
    this._messageStreams.delete(topic);
  }

  async signal (message: SignalMessage): Promise<void> {
    const payload: Any = {
      type_url: 'dxos.mesh.signalMessage.SignalMessage',
      value: schema.getCodecForType('dxos.mesh.signalMessage.SignalMessage').encode(message)
    };
    return this._client.sendMessage(message.id, message.remoteId, payload);
  }

  @synchronized
  private async _subscribeSwarmEvents (topic: PublicKey, peerId: PublicKey): Promise<void> {
    assert(!this._swarmStreams.has(topic));
    const swarmStream = await this._client.join(topic, peerId);
    // Subscribing to swarm events.
    // TODO(mykola): What happens when the swarm stream is closed? Maybe send leave event for each peer?
    swarmStream.subscribe((swarmEvent: SwarmEvent) => {
      this.swarmEvent.emit([topic, swarmEvent]);
    });

    // Saving swarm stream.
    this._swarmStreams.set(topic, swarmStream);

    this._cleanupSubscriptions.push(() => {
      swarmStream.close();
      this._swarmStreams.delete(topic);
    });
  }

  private async _subscribeMessages (peerId: PublicKey) {
    // Subscribing to messages.
    const messageStream = await this._client.receiveMessages(peerId);
    messageStream.subscribe(async (message: Message) => {
      if (message.payload.type_url === 'dxos.mesh.signalMessage.SignalMessage') {
        const signalMessage = schema.getCodecForType('dxos.mesh.signalMessage.SignalMessage').decode(message.payload.value);
        log('Message received: ' + JSON.stringify(signalMessage));
        assert(signalMessage.remoteId.equals(peerId));
        await this._onSignal(signalMessage);
      } else {
        log('Unknown message type: ' + message.payload.type_url);
      }
    });

    // Saving message stream.
    if (!this._messageStreams.has(peerId)) {
      this._messageStreams.set(peerId, messageStream);
    }

    this._cleanupSubscriptions.push(() => {
      messageStream.close();
      this._messageStreams.delete(peerId);
    });
  }

}
