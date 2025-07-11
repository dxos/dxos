//
// Copyright 2021 DXOS.org
//

import { DeferredTask, Event, sleep, scheduleTask, scheduleTaskInterval, synchronized, Trigger } from '@dxos/async';
import { Context, cancelWithContext, ContextDisposedError } from '@dxos/context';
import { ErrorStream } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { type PeerInfo } from '@dxos/messaging';
import {
  CancelledError,
  ProtocolError,
  ConnectionResetError,
  ConnectivityError,
  TimeoutError,
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

  private _protocolClosed = new Trigger();
  private _transportClosed = new Trigger();

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
    public readonly localInfo: PeerInfo,
    public readonly remoteInfo: PeerInfo,
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
      localPeer: this.localInfo,
      remotePeer: this.remoteInfo,
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
  async openConnection(): Promise<void> {
    invariant(this._state === ConnectionState.INITIAL, 'Invalid state.');
    log.trace('dxos.mesh.connection.open-connection', trace.begin({ id: this._instanceId }));
    log.trace('dxos.mesh.connection.open', {
      sessionId: this.sessionId,
      topic: this.topic,
      localPeerId: this.localInfo,
      remotePeerId: this.remoteInfo,
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
      this._protocolClosed.wake();
      this.close({ error: new ProtocolError('protocol stream closed') }).catch((err) => this.errors.raise(err));
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
      ownPeerKey: this.localInfo.peerKey,
      remotePeerKey: this.remoteInfo.peerKey,
      topic: this.topic.toHex(),
      initiator: this.initiator,
      stream: this._protocol.stream,
      sendSignal: async (signal) => this._sendSignal(signal),
      sessionId: this.sessionId,
    });

    this._transport.connected.once(async () => {
      this._changeState(ConnectionState.CONNECTED);
      await this.connectedTimeoutContext.dispose();
      this._callbacks?.onConnected?.();

      scheduleTaskInterval(this._ctx, async () => this._emitTransportStats(), TRANSPORT_STATS_INTERVAL);
    });

    this._transport.closed.once(() => {
      this._transport = undefined;
      this._transportClosed.wake();
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
        this.abort(err).catch((err) => this.errors.raise(err));
      } else if (err instanceof ConnectivityError) {
        log.info('aborting due to transport ConnectivityError');
        this.abort(err).catch((err) => this.errors.raise(err));
      }

      if (this._state !== ConnectionState.CLOSED && this._state !== ConnectionState.CLOSING) {
        await this.connectedTimeoutContext.dispose();
        this.errors.raise(err);
      }
    });

    await this._transport.open();

    // Replay signals that were received before transport was created.
    for (const signal of this._incomingSignalBuffer) {
      void this._transport.onSignal(signal); // TODO(burdon): Remove async?
    }

    this._incomingSignalBuffer = [];

    log.trace('dxos.mesh.connection.open-connection', trace.end({ id: this._instanceId }));
  }

  @synchronized
  // TODO(nf): make the caller responsible for recording the reason and determining flow control.
  // TODO(nf): make abort cancel an existing close in progress.
  async abort(err?: Error): Promise<void> {
    log('abort', { err });
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

    log('aborting...', { peerId: this.localInfo, err });

    try {
      // Forcefully close the stream flushing any unsent data packets.
      await this._closeProtocol({ abort: true });
    } catch (err: any) {
      log.catch(err);
    }

    try {
      // After the transport is closed streams are disconnected.
      await this._closeTransport();
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
  async close({ error, reason }: { error?: Error; reason?: string } = {}): Promise<void> {
    log('close', { error });
    if (!this.closeReason) {
      this.closeReason = reason ?? error?.message;
    } else {
      this.closeReason += `; ${reason ?? error?.message}`;
    }
    if (
      this._state === ConnectionState.CLOSED ||
      this._state === ConnectionState.ABORTING ||
      this._state === ConnectionState.ABORTED
    ) {
      log('close ignored: already in progress', { state: this._state, error });
      return;
    }
    const lastState = this._state;
    this._changeState(ConnectionState.CLOSING);

    await this.connectedTimeoutContext.dispose();
    await this._ctx.dispose();

    let abortProtocol = false;
    if (lastState !== ConnectionState.CONNECTED || error != null) {
      log(`graceful close requested when we were in ${lastState} state? aborting`);
      abortProtocol = true;
    }

    log('closing...', { peerId: this.localInfo, abortProtocol, error });

    try {
      await this._closeProtocol({ abort: abortProtocol });
    } catch (err: any) {
      log.catch(err);
    }
    try {
      // After the transport is closed streams are disconnected.
      await this._closeTransport();
    } catch (err: any) {
      log.catch(err);
    }

    log('closed', { peerId: this.localInfo });
    this._changeState(ConnectionState.CLOSED);
    this._callbacks?.onClosed?.(error);
  }

  private async _closeProtocol(options?: { abort: boolean }): Promise<void> {
    log('closing protocol', options);
    await Promise.race([options?.abort ? this._protocol.abort() : this._protocol.close(), this._protocolClosed.wait()]);
    log('protocol closed', options);
  }

  private async _closeTransport(): Promise<void> {
    log('closing transport');
    await Promise.race([this._transport?.close(), this._transportClosed.wait()]);
    log('transport closed');
  }

  private _sendSignal(signal: Signal): void {
    this._outgoingSignalBuffer.push(signal);
    this._signalSendTask.schedule();
  }

  private async _flushSignalBuffer(): Promise<void> {
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
        author: this.localInfo,
        recipient: this.remoteInfo,
        sessionId: this.sessionId,
        topic: this.topic,
        data: { signalBatch: { signals } },
      });
    } catch (err) {
      // TODO(nf): determine why instanceof doesn't work here
      if (
        err instanceof CancelledError ||
        err instanceof ContextDisposedError ||
        (err instanceof Error && err.message?.includes('CANCELLED'))
      ) {
        return;
      }

      // If signal fails treat connection as failed
      log.info('signal message failed to deliver', { err });
      await this.close({ error: new ConnectivityError('signal message failed to deliver', err) });
    }
  }

  /**
   * Receive a signal from the remote peer.
   */
  async signal(msg: SignalMessage): Promise<void> {
    invariant(msg.sessionId);
    if (!msg.sessionId.equals(this.sessionId)) {
      log('dropping signal for incorrect session id');
      return;
    }
    invariant(msg.data.signal || msg.data.signalBatch);
    invariant(msg.author.peerKey === this.remoteInfo.peerKey);
    invariant(msg.recipient.peerKey === this.localInfo.peerKey);

    const signals = msg.data.signalBatch ? msg.data.signalBatch.signals ?? [] : [msg.data.signal];
    for (const signal of signals) {
      if (!signal) {
        continue;
      }

      if ([ConnectionState.CREATED, ConnectionState.INITIAL].includes(this.state)) {
        log('buffered signal', { peerId: this.localInfo, remoteId: this.remoteInfo, msg: msg.data });
        this._incomingSignalBuffer.push(signal);
      } else {
        invariant(this._transport, 'Connection not ready to accept signals.');
        log('received signal', { peerId: this.localInfo, remoteId: this.remoteInfo, msg: msg.data });
        await this._transport.onSignal(signal);
      }
    }
  }

  initiate(): void {
    this._changeState(ConnectionState.INITIAL);
  }

  private _changeState(state: ConnectionState): void {
    log('stateChanged', { from: this._state, to: state, peerId: this.localInfo });
    invariant(state !== this._state, 'Already in this state.');
    this._state = state;
    this.stateChanged.emit(state);
  }

  private async _emitTransportStats(): Promise<void> {
    const stats = await this.transport?.getStats();
    if (stats) {
      this.transportStats.emit(stats);
    }
  }
}
