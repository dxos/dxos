//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { Protocol } from '@dxos/mesh-protocol';
import { PublicKey } from '@dxos/protocols';

import { Message } from '../proto/gen/dxos/mesh/signal';
import { Transport, TransportFactory } from '../transport';

const log = debug('dxos:network-manager:swarm:connection');

/**
 * State machine for each connection.
 */
export enum ConnectionState {
  /**
   * Initial state. Connection is registered but no attempt to connect to the remote peer has been performed. Might mean that we are waiting for the answer signal from the remote peer.
   */
  INITIAL = 'INITIAL',

  /**
   * Originating a connection.
   */
  INITIATING_CONNECTION = 'INITIATING_CONNECTION',

  /**
   * Waiting for a connection to be originated from the remote peer.
   */
  WAITING_FOR_CONNECTION = 'WAITING_FOR_CONNECTION',

  /**
   * Connection is established.
   */
  CONNECTED = 'CONNECTED',

  /**
   * Connection closed.
   */
  CLOSED = 'CLOSED',
}

/**
 * Represents a connection to a remote peer.
 */
export class Connection {
  private _state: ConnectionState = ConnectionState.INITIAL;
  private _transport: Transport | undefined;
  private _bufferedSignals: Message[] = [];

  readonly stateChanged = new Event<ConnectionState>();
  readonly errors = new ErrorStream();

  constructor (
    public readonly topic: PublicKey,
    public readonly ownId: PublicKey,
    public readonly remoteId: PublicKey,
    public readonly sessionId: PublicKey,
    public readonly initiator: boolean,
    private readonly _sendSignal: (msg: Message) => Promise<void>,
    private readonly _protocol: Protocol,
    private readonly _transportFactory: TransportFactory
  ) {}

  get state () {
    return this._state;
  }

  get transport () {
    return this._transport;
  }

  get protocol () {
    return this._protocol;
  }

  connect () {
    assert(this._state === ConnectionState.INITIAL, 'Invalid state.');

    this._state = this.initiator ? ConnectionState.INITIATING_CONNECTION : ConnectionState.WAITING_FOR_CONNECTION;
    this.stateChanged.emit(this._state);

    assert(!this._transport);
    this._transport = this._transportFactory({
      topic: this.topic,
      ownId: this.ownId,
      remoteId: this.remoteId,
      sessionId: this.sessionId,
      initiator: this.initiator,
      stream: this._protocol.stream,
      sendSignal: this._sendSignal
    });

    this._transport.connected.once(() => {
      this._state = ConnectionState.CONNECTED;
      this.stateChanged.emit(this._state);
    });

    this._transport.closed.once(() => {
      this._transport = undefined;
      this.close().catch(err => this.errors.raise(err));
    });

    this._transport.errors.pipeTo(this.errors);

    // Replay signals that were received before transport was created.
    for (const signal of this._bufferedSignals) {
      void this._transport.signal(signal); // TODO(burdon): Remove async?
    }

    this._bufferedSignals = [];
  }

  async signal (msg: Message) {
    assert(msg.sessionId);
    if (!msg.sessionId.equals(this.sessionId)) {
      log('Dropping signal for incorrect session id.');
      return;
    }
    assert(msg.data);
    if (msg.data.offer && this._state === ConnectionState.INITIATING_CONNECTION) {
      throw new Error('Invalid state: Cannot send offer to an initiating peer.');
    }
    assert(msg.id?.equals(this.remoteId));
    assert(msg.remoteId?.equals(this.ownId));

    if (this._state === ConnectionState.INITIAL) {
      log(`${this.ownId} buffered signal from ${this.remoteId}: ${msg.data}`);
      this._bufferedSignals.push(msg);
      return;
    }

    assert(this._transport, 'Connection not ready to accept signals.');
    log(`${this.ownId} received signal from ${this.remoteId}: ${msg.data}`);
    await this._transport.signal(msg);
  }

  @synchronized
  async close () {
    if (this._state === ConnectionState.CLOSED) {
      return;
    }
    // TODO(marik-d): CLOSING state.

    log(`Closing ${this.ownId}`);

    // This will try to gracefull close the stream flushing any unsent data packets.
    await this._protocol.close();

    // After the transport is closed streams are disconnected.
    await this._transport?.close();

    log(`Closed ${this.ownId}`);

    this._state = ConnectionState.CLOSED;
    this.stateChanged.emit(this._state);
  }
}
