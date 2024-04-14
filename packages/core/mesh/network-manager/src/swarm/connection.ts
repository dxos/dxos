//
// Copyright 2021 DXOS.org
//

import { DeferredTask, Event, sleep, scheduleTask, scheduleTaskInterval, synchronized } from '@dxos/async';
import { Context, cancelWithContext } from '@dxos/context';
import { ErrorStream } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import {
  CancelledError,
  ProtocolError,
  ConnectionResetError,
  ConnectivityError,
  TimeoutError,
  UnknownProtocolError,
  trace,
} from '@dxos/protocols';
import { type Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { type SignalMessage, type SignalMessenger } from '../signal';
import { type Transport, type TransportFactory, type TransportStats } from '../transport';
import { type WireProtocol } from '../wire-protocol';

/**
 * How long to wait before sending the signal in case we receive another signal.
 * This value is increased exponentially.
 */
const STARTING_SIGNALLING_DELAY = 10;

/**
 * How long to wait for the transport to establish connectivity, i.e. for the connection to move between CONNECTING and CONNECTED.
 */
const TRANSPORT_CONNECTION_TIMEOUT = 10_000;

const TRANSPORT_STATS_INTERVAL = 5_000;

/**
 * Maximum delay between signal batches.
 */
const MAX_SIGNALLING_DELAY = 300;

interface ConnectionCallbacks {
  /**
   * Connection opened.
   */
  onConnected?: () => void;

  /**
   * Connection closed.
   */
  onClosed?: (err?: Error) => void;
}

/**
 * State machine for each connection.
 */
export enum ConnectionState {
  /**
   *  Connection is created, but not yet passed through the connection limiter.
   */
  CREATED = 'CREATED',

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

  ABORTING = 'ABORTING',
  ABORTED = 'ABORTED',
}

/**
 * Represents a connection to a remote peer.
 * Owns a transport paired together with a wire-protocol.
 */
export class Connection {
  private readonly _ctx = new Context();
  private connectedTimeoutContext = new Context();

  private _state: ConnectionState = ConnectionState.CREATED;
  private _transport: Transport | undefined;
  closeReason?: string;

  private _incomingSignalBuffer: Signal[] = [];
  private _outgoingSignalBuffer: Signal[] = [];

  readonly stateChanged = new Event<ConnectionState>();
  readonly errors = new ErrorStream();

  public _instanceId = PublicKey.random().toHex();

  public readonly transportStats = new Event<TransportStats>();

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
    private readonly _callbacks?: ConnectionCallbacks,
  ) {
    log.trace('dxos.mesh.connection.construct', {
      sessionId: this.sessionId,
      topic: this.topic,
      localPeerId: this.ownId,
      remotePeerId: this.remoteId,
      initiator: this.initiator,
    });
  }

  @logInfo
  get sessionIdString(): string {
    return this.sessionId.truncate();
  }

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
    log.trace('dxos.mesh.connection.open', {
      sessionId: this.sessionId,
      topic: this.topic,
      localPeerId: this.ownId,
      remotePeerId: this.remoteId,
      initiator: this.initiator,
    });

    this._changeState(ConnectionState.CONNECTING);

    // TODO(dmaretskyi): Initialize only after the transport has established connection.
    this._protocol.open(this.sessionId).catch((err) => {
      this.errors.raise(err);
    });

    // TODO(dmaretskyi): Piped streams should do this automatically, but it break's without this code.
    this._protocol.stream.on('close', () => {
      log('protocol stream closed');
      this.close(new ProtocolError('protocol stream closed')).catch((err) => this.errors.raise(err));
    });

    scheduleTask(
      this.connectedTimeoutContext,
      async () => {
        log.info(`timeout waiting ${TRANSPORT_CONNECTION_TIMEOUT / 1000}s for transport to connect, aborting`);
        await this.abort(new TimeoutError(`${TRANSPORT_CONNECTION_TIMEOUT / 1000}s for transport to connect`)).catch(
          (err) => this.errors.raise(err),
        );
      },
      TRANSPORT_CONNECTION_TIMEOUT,
    );

    invariant(!this._transport);
    this._transport = this._transportFactory.createTransport({
      initiator: this.initiator,
      stream: this._protocol.stream,
      sendSignal: async (signal) => this._sendSignal(signal),
      sessionId: this.sessionId,
    });

    await this._transport.open();

    this._transport.connected.once(async () => {
      this._changeState(ConnectionState.CONNECTED);
      await this.connectedTimeoutContext.dispose();
      this._callbacks?.onConnected?.();

      scheduleTaskInterval(this._ctx, async () => this._emitTransportStats(), TRANSPORT_STATS_INTERVAL);
    });

    this._transport.closed.once(() => {
      this._transport = undefined;
      log('abort triggered by transport close');
      this.abort().catch((err) => this.errors.raise(err));
    });

    this._transport.errors.handle(async (err) => {
      log('transport error:', { err });
      if (!this.closeReason) {
        this.closeReason = err?.message;
      }

      // TODO(nf): fix ErrorStream so instanceof works here
      if (err instanceof ConnectionResetError) {
        log.info('aborting due to transport ConnectionResetError');
        this.abort().catch((err) => this.errors.raise(err));
      } else if (err instanceof ConnectivityError) {
        log.info('aborting due to transport ConnectivityError');
        this.abort().catch((err) => this.errors.raise(err));
      } else if (err instanceof UnknownProtocolError) {
        log.warn('unsure what to do with UnknownProtocolError, will keep on truckin', { err });
      }

      if (this._state !== ConnectionState.CLOSED && this._state !== ConnectionState.CLOSING) {
        await this.connectedTimeoutContext.dispose();
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
  // TODO(nf): make the caller responsible for recording the reason and determining flow control.
  // TODO(nf): make abort cancel an existing close in progress.
  async abort(err?: Error) {
    log('aborting...', { err });
    if (this._state === ConnectionState.CLOSED || this._state === ConnectionState.ABORTED) {
      log(`abort ignored: already ${this._state}`, this.closeReason);
      return;
    }

    await this.connectedTimeoutContext.dispose();
    this._changeState(ConnectionState.ABORTING);
    if (!this.closeReason) {
      this.closeReason = err?.message;
    }

    await this._ctx.dispose();

    try {
      // Forcefully close the stream flushing any unsent data packets.
      log('aborting protocol... ');
      await this._protocol.abort();
    } catch (err: any) {
      log.catch(err);
    }

    try {
      // After the transport is closed streams are disconnected.
      await this._transport?.destroy();
    } catch (err: any) {
      log.catch(err);
    }

    try {
      this._callbacks?.onClosed?.(err);
    } catch (err) {
      log.catch(err);
    }
    this._changeState(ConnectionState.ABORTED);
  }

  @synchronized
  async close(err?: Error) {
    if (!this.closeReason) {
      this.closeReason = err?.message;
    } else {
      this.closeReason += `; ${err?.message}`;
    }
    if (
      this._state === ConnectionState.CLOSED ||
      this._state === ConnectionState.ABORTING ||
      this._state === ConnectionState.ABORTED
    ) {
      return;
    }
    const lastState = this._state;
    this._changeState(ConnectionState.CLOSING);

    await this.connectedTimeoutContext.dispose();
    await this._ctx.dispose();

    log('closing...', { peerId: this.ownId });

    if (lastState === ConnectionState.CONNECTED) {
      try {
        // Gracefully close the stream flushing any unsent data packets.
        await this._protocol.close();
      } catch (err: any) {
        log.catch(err);
      }

      try {
        // After the transport is closed streams are disconnected.
        await this._transport?.destroy();
      } catch (err: any) {
        log.catch(err);
      }
    } else {
      log.info(`graceful close requested when we were in ${lastState} state? aborting`);
      try {
        await this._protocol.abort();
      } catch (err: any) {
        log.catch(err);
      }
      try {
        await this._transport?.destroy();
      } catch (err: any) {
        log.catch(err);
      }
    }

    log('closed', { peerId: this.ownId });
    this._changeState(ConnectionState.CLOSED);
    this._callbacks?.onClosed?.(err);
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
      if (process.env.NODE_ENV !== 'test') {
        await cancelWithContext(this._ctx, sleep(this._signallingDelay));
        this._signallingDelay = Math.min(this._signallingDelay * 2, MAX_SIGNALLING_DELAY);
      }

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
      // TODO(nf): determine why instanceof doesn't work here
      if (err instanceof CancelledError || (err instanceof Error && err.message?.includes('CANCELLED'))) {
        return;
      }

      // If signal fails treat connection as failed
      log.info('signal message failed to deliver', { err });
      await this.close(new ConnectivityError('signal message failed to deliver', err));
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

      if ([ConnectionState.CREATED, ConnectionState.INITIAL].includes(this.state)) {
        log('buffered signal', { peerId: this.ownId, remoteId: this.remoteId, msg: msg.data });
        this._incomingSignalBuffer.push(signal);
      } else {
        invariant(this._transport, 'Connection not ready to accept signals.');
        log('received signal', { peerId: this.ownId, remoteId: this.remoteId, msg: msg.data });
        await this._transport.signal(signal);
      }
    }
  }

  initiate() {
    this._changeState(ConnectionState.INITIAL);
  }

  private _changeState(state: ConnectionState): void {
    log('stateChanged', { from: this._state, to: state, peerId: this.ownId });
    invariant(state !== this._state, 'Already in this state.');
    this._state = state;
    this.stateChanged.emit(state);
  }

  private async _emitTransportStats() {
    const stats = await this.transport?.getStats();
    if (stats) {
      this.transportStats.emit(stats);
    }
  }
}
