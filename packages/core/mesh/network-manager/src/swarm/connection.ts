//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { SignalMessage, SignalMessenger } from '../signal';
import { Transport, TransportFactory } from '../transport';
import { WireProtocol } from '../wire-protocol';

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
   * Trying to establish connection.
   */
  CONNECTING = 'CONNECTING',

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
 * Owns a transport paired together with a wire-protocol.
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
    private readonly _signalMessaging: SignalMessenger,
    private readonly _protocol: WireProtocol,
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

  /**
   * Create an underlying transport and prepares it for the connection.
   */
  // TODO(burdon): Make async?
  openConnection() {
    assert(this._state === ConnectionState.INITIAL, 'Invalid state.');
    this._changeState(ConnectionState.CONNECTING);

    // TODO(dmaretskyi): Initialize only after the transport has established connection.
    this._protocol.initialize().catch((err) => {
      this.errors.raise(err);
    });

    assert(!this._transport);
    this._transport = this._transportFactory.createTransport({
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

    log('closing...', { peerId: this.ownId });

    try {
      // Gracefully close the stream flushing any unsent data packets.
      await this._protocol.destroy();
    } catch (err: any) {
      log.catch(err);
    }

    try {
      // After the transport is closed streams are disconnected.
      await this._transport?.destroy();
    } catch (err: any) {
      log.catch(err);
    }

    log('closed', { peerId: this.ownId });
    this._changeState(ConnectionState.CLOSED);
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
    assert(state !== this._state, 'Already in this state.');
    this._state = state;
    this.stateChanged.emit(state);
  }
}
