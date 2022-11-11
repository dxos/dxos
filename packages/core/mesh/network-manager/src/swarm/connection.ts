//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Protocol } from '@dxos/mesh-protocol';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { SignalMessage, SignalMessaging } from '../signal';
import { Transport, TransportFactory } from '../transport';

/**
 * State machine for each connection.
 */
export enum ConnectionState {
  /**
   * Initial state. Connection is registered but no attempt to connect to the remote peer has been performed.
   * Might mean that we are waiting for the answer signal from the remote peer.
   */
  INITIAL = 'INITIAL',

  /**
   * Originating a connection.
   */
  INITIATING_CONNECTION = 'INITIATING_CONNECTION',

  /**
   * Waiting for a connection to be originated from the remote peer.
   */
  CONNECTING = 'CONNECTING',

  /**
   * Peer rejected offer.
   */
  ACCEPTED = 'ACCEPTED',

  /**
   * Peer rejected offer.
   */
  REJECTED = 'REJECTED',

  /**
   * Connection is established.
   */
  CONNECTED = 'CONNECTED',

  /**
   * Connection closed.
   */
  CLOSED = 'CLOSED'
}

/**
 * Represents a connection to a remote peer.
 */
export class Connection {
  private _state: ConnectionState = ConnectionState.INITIAL;
  private _transport: Transport | undefined;
  private _bufferedSignals: Signal[] = [];

  readonly stateChanged = new Event<ConnectionState>();
  readonly errors = new ErrorStream();

  constructor(
    public readonly topic: PublicKey,
    public readonly ownId: PublicKey, // TODO(burdon): peerID?
    public readonly remoteId: PublicKey,
    public readonly sessionId: PublicKey,
    public readonly initiator: boolean,
    private readonly _signalMessaging: SignalMessaging,
    private readonly _protocol: Protocol,
    private readonly _transportFactory: TransportFactory
  ) {}

  get state() {
    return this._state;
  }

  get transport() {
    return this._transport;
  }

  get protocol() {
    return this._protocol;
  }

  // TODO(burdon): Make async.
  initiate() {
    this._signalMessaging
      .offer({
        author: this.ownId,
        recipient: this.remoteId,
        sessionId: this.sessionId,
        topic: this.topic,
        data: { offer: {} }
      })
      .then((answer) => {
        log('received', { answer, topic: this.topic, ownId: this.ownId, remoteId: this.remoteId });
        if (this.state !== ConnectionState.INITIAL) {
          log('ignoring response');
          return;
        }

        if (answer.accept) {
          try {
            this.open();
          } catch (err: any) {
            this.errors.raise(err);
          }
        } else {
          // If the peer rejected our connection remove it from the set of candidates.
          this._changeState(ConnectionState.REJECTED);
        }

        this._changeState(ConnectionState.ACCEPTED);
      })
      .catch((err) => {
        this.errors.raise(err);
      });
  }

  // TODO(burdon): Make async?
  open() {
    assert(this._state === ConnectionState.INITIAL, 'Invalid state.');
    this._changeState(this.initiator ? ConnectionState.INITIATING_CONNECTION : ConnectionState.CONNECTING);

    assert(!this._transport);
    this._transport = this._transportFactory.create({
      initiator: this.initiator,
      stream: this._protocol.stream,
      sendSignal: async (signal) => {
        await this._signalMessaging.signal({
          author: this.ownId,
          recipient: this.remoteId,
          sessionId: this.sessionId,
          topic: this.topic,
          data: { signal }
        });
      }
    });

    this._transport.connected.once(() => {
      this._changeState(ConnectionState.CONNECTED);
    });

    this._transport.closed.once(() => {
      this._transport = undefined;
      this.close().catch((err) => this.errors.raise(err));
    });

    this._transport.errors.pipeTo(this.errors);

    // Replay signals that were received before transport was created.
    for (const signal of this._bufferedSignals) {
      void this._transport.signal(signal); // TODO(burdon): Remove async?
    }

    this._bufferedSignals = [];
  }

  @synchronized
  async close() {
    if (this._state === ConnectionState.CLOSED) {
      return;
    }

    // TODO(dmaretskyi): CLOSING state.
    log('closing', { peerId: this.ownId });

    // This will try to gracefull close the stream flushing any unsent data packets.
    await this._protocol.close();

    // After the transport is closed streams are disconnected.
    await this._transport?.close();

    this._changeState(ConnectionState.CLOSED);
    log('closed', { peerId: this.ownId });
  }

  async signal(msg: SignalMessage) {
    assert(msg.sessionId);
    if (!msg.sessionId.equals(this.sessionId)) {
      log('dropping signal for incorrect session id');
      return;
    }
    assert(msg.data.signal);
    assert(msg.author?.equals(this.remoteId));
    assert(msg.recipient?.equals(this.ownId));

    if (this._state === ConnectionState.INITIAL) {
      log('buffered signal', { peerId: this.ownId, remoteId: this.remoteId, msg: msg.data });
      this._bufferedSignals.push(msg.data.signal);
      return;
    }

    assert(this._transport, 'Connection not ready to accept signals.');
    log('received signal', { peerId: this.ownId, remoteId: this.remoteId, msg: msg.data });
    await this._transport.signal(msg.data.signal);
  }

  private _changeState(state: ConnectionState): void {
    this._state = state;
    this.stateChanged.emit(state);
  }
}
