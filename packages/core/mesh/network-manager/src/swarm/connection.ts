//
// Copyright 2021 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { DeferredTask, Event, sleep, synchronized } from '@dxos/async';
import { Context, cancelWithContext } from '@dxos/context';
import { ErrorStream } from '@dxos/debug';
import { CancelledError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/protocols';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { SignalMessage, SignalMessenger } from '../signal';
import { Transport, TransportFactory } from '../transport';
import { WireProtocol } from '../wire-protocol';

/**
 * How long to wait before sending the signal in case we receive another signal.
 * This value is increased exponentially.
 */
const STARTING_SIGNALLING_DELAY = 10;

/**
 * Maximum delay between signal batches.
 */
const MAX_SIGNALLING_DELAY = 300;

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
   * Connection is being closed.
   */
  CLOSING = 'CLOSING',

  /**
   * Connection closed.
   */
  CLOSED = 'CLOSED',
}

/**
 * Represents a connection to a remote peer.
 * Owns a transport paired together with a wire-protocol.
 */
export class Connection {
  private readonly _ctx = new Context();

  private _state: ConnectionState = ConnectionState.INITIAL;
  private _transport: Transport | undefined;

  private _incomingSignalBuffer: Signal[] = [];
  private _outgoingSignalBuffer: Signal[] = [];

  readonly stateChanged = new Event<ConnectionState>();
  readonly errors = new ErrorStream();

  public _instanceId = PublicKey.random().toHex();

  private readonly _signalSendTask = new DeferredTask(this._ctx, async () => {
    await this._flushSignalBuffer();
  });

  private _signallingDelay = STARTING_SIGNALLING_DELAY;

  constructor(
    public readonly topic: PublicKey,
    public readonly ownId: PublicKey, // TODO(burdon): peerID?
    public readonly remoteId: PublicKey,
    public readonly sessionId: PublicKey,
    public readonly initiator: boolean,
    private readonly _signalMessaging: SignalMessenger,
    private readonly _protocol: WireProtocol,
    private readonly _transportFactory: TransportFactory,
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
  async openConnection() {
    invariant(this._state === ConnectionState.INITIAL, 'Invalid state.');
    log.trace('dxos.mesh.connection.open-connection', trace.begin({ id: this._instanceId }));

    this._changeState(ConnectionState.CONNECTING);

    // TODO(dmaretskyi): Initialize only after the transport has established connection.
    this._protocol.initialize().catch((err) => {
      this.errors.raise(err);
    });

    // TODO(dmaretskyi): Piped streams should do this automatically, but it break's without this code.
    this._protocol.stream.on('close', () => {
      log('protocol stream closed');
      this.close().catch((err) => this.errors.raise(err));
    });

    invariant(!this._transport);
    this._transport = this._transportFactory.createTransport({
      initiator: this.initiator,
      stream: this._protocol.stream,
      sendSignal: async (signal) => this._sendSignal(signal),
    });

    this._transport.connected.once(() => {
      this._changeState(ConnectionState.CONNECTED);
    });

    this._transport.closed.once(() => {
      this._transport = undefined;
      this.close().catch((err) => this.errors.raise(err));
    });

    this._transport.errors.handle((err) => {
      if (this._state !== ConnectionState.CLOSED && this._state !== ConnectionState.CLOSING) {
        this.errors.raise(err);
      }
    });

    // Replay signals that were received before transport was created.
    for (const signal of this._incomingSignalBuffer) {
      void this._transport.signal(signal); // TODO(burdon): Remove async?
    }

    this._incomingSignalBuffer = [];

    log.trace('dxos.mesh.connection.open-connection', trace.end({ id: this._instanceId }));
  }

  @synchronized
  async close() {
    if (this._state === ConnectionState.CLOSED) {
      return;
    }
    this._changeState(ConnectionState.CLOSING);

    await this._ctx.dispose();

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

  private _sendSignal(signal: Signal) {
    this._outgoingSignalBuffer.push(signal);
    this._signalSendTask.schedule();
  }

  private async _flushSignalBuffer() {
    if (this._outgoingSignalBuffer.length === 0) {
      return;
    }

    try {
      await cancelWithContext(this._ctx, sleep(this._signallingDelay));
      this._signallingDelay = Math.min(this._signallingDelay * 2, MAX_SIGNALLING_DELAY);

      const signals = [...this._outgoingSignalBuffer];
      this._outgoingSignalBuffer.length = 0;

      await this._signalMessaging.signal({
        author: this.ownId,
        recipient: this.remoteId,
        sessionId: this.sessionId,
        topic: this.topic,
        data: { signalBatch: { signals } },
      });
    } catch (err) {
      if (err instanceof CancelledError) {
        return;
      }

      // If signal fails treat connection as failed
      log.warn('Signal failed', { err });
      await this.close();
    }
  }

  /**
   * Receive a signal from the remote peer.
   */
  async signal(msg: SignalMessage) {
    invariant(msg.sessionId);
    if (!msg.sessionId.equals(this.sessionId)) {
      log('dropping signal for incorrect session id');
      return;
    }
    invariant(msg.data.signal || msg.data.signalBatch);
    invariant(msg.author?.equals(this.remoteId));
    invariant(msg.recipient?.equals(this.ownId));

    const signals = msg.data.signalBatch ? msg.data.signalBatch.signals ?? [] : [msg.data.signal];
    for (const signal of signals) {
      if (!signal) {
        continue;
      }

      if (this._state === ConnectionState.INITIAL) {
        log('buffered signal', { peerId: this.ownId, remoteId: this.remoteId, msg: msg.data });
        this._incomingSignalBuffer.push(signal);
      } else {
        invariant(this._transport, 'Connection not ready to accept signals.');
        log('received signal', { peerId: this.ownId, remoteId: this.remoteId, msg: msg.data });
        await this._transport.signal(signal);
      }
    }
  }

  private _changeState(state: ConnectionState): void {
    log('stateChanged', { from: this._state, too: state, peerId: this.ownId });
    invariant(state !== this._state, 'Already in this state.');
    this._state = state;
    this.stateChanged.emit(state);
  }
}
