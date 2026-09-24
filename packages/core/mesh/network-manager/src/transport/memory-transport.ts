//
// Copyright 2020 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { Event, Trigger } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { type Signal, SignalSchema } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';
import { ComplexMap } from '@dxos/util';

import {
  type Transport,
  TRANSPORT_CONNECTION_TIMEOUT,
  type TransportFactory,
  type TransportOptions,
} from './transport.ts';

// TODO(burdon): Make configurable.
// Delay (in milliseconds) for data being sent through in-memory connections to simulate network latency.
const MEMORY_TRANSPORT_DELAY = 1;

/** Leaves the wait for a remote signal to report its own cause before `Connection` aborts. */
const ABORT_MARGIN = 1_000;

const REMOTE_SIGNAL_TIMEOUT = TRANSPORT_CONNECTION_TIMEOUT - ABORT_MARGIN;

/**
 * Grace period for in-flight chunks to reach the peer before the pipes are detached.
 * Aborting outright discards whatever the delay transform is holding, which loses the peer's RPC
 * `bye` and leaves its graceful close waiting out the full timeout.
 */
const PIPE_DRAIN_TIMEOUT = 100;

/**
 * Creates a binary stream that delays data being sent through the stream by the specified amount of time.
 */
const createStreamDelay = (delay: number): TransformStream<Uint8Array, Uint8Array> => {
  return new TransformStream({
    transform: async (chunk, controller) => {
      await new Promise((resolve) => setTimeout(resolve, delay)); // TODO(burdon): Randomize.
      controller.enqueue(chunk);
    },
  });
};

export const MemoryTransportFactory: TransportFactory = {
  createTransport: (options) => new MemoryTransport(options),
};

/**
 * Fake transport.
 */
export class MemoryTransport implements Transport {
  // TODO(burdon): Remove static properties (inject context into constructor).
  private static readonly _connections = new ComplexMap<PublicKey, MemoryTransport>(PublicKey.hash);

  @logInfo
  private readonly _instanceId = PublicKey.random(); // TODO(burdon): Rename peerId? (Use local/remote labels in logs).

  private readonly _remote = new Trigger<PublicKey>();

  private readonly _outgoingDelay = createStreamDelay(MEMORY_TRANSPORT_DELAY);
  private readonly _incomingDelay = createStreamDelay(MEMORY_TRANSPORT_DELAY);
  private _pipes: Promise<void>[] = [];
  // Detaches both pipe directions without ending either peer's wire-protocol stream: the streams
  // outlive the transport and the peer's must survive our close. Re-made on every connect, since an
  // AbortController is single-use.
  private _abort = new AbortController();

  private _closed = false;

  @logInfo
  private _remoteInstanceId!: PublicKey;

  private _remoteConnection?: MemoryTransport;

  public readonly closed = new Event<void>();
  public readonly connected = new Event<void>();
  public readonly errors = new ErrorStream();

  constructor(private readonly _options: TransportOptions) {
    invariant(!MemoryTransport._connections.has(this._instanceId), 'Duplicate memory connection');
    MemoryTransport._connections.set(this._instanceId, this);
  }

  get isOpen() {
    // TODO(burdon): Open state?
    return !this._closed;
  }

  async open(): Promise<this> {
    log('opening...');

    // Initiator will send a signal, the receiver will receive the unique ID and connect the streams.
    if (this._options.initiator) {
      log('sending signal');
      try {
        await this._options.sendSignal(create(SignalSchema, { payload: { transportId: this._instanceId.toHex() } }));
      } catch (err) {
        if (!this._closed) {
          this.errors.raise(toError(err));
        }
      }
    } else {
      // Don't block the open method.
      this._remote
        .wait({ timeout: this._options.timeout ?? REMOTE_SIGNAL_TIMEOUT })
        .then((remoteId) => {
          if (this._closed) {
            return;
          }

          this._remoteInstanceId = remoteId;
          this._remoteConnection = MemoryTransport._connections.get(this._remoteInstanceId);
          if (!this._remoteConnection) {
            // Remote connection was destroyed before we could connect.
            this._closed = true;
            this.closed.emit();
            return;
          }

          invariant(!this._remoteConnection._remoteConnection, `Remote already connected: ${this._remoteInstanceId}`);
          this._remoteConnection._remoteConnection = this;
          this._remoteConnection._remoteInstanceId = this._instanceId;

          log('connected');
          const remote = this._remoteConnection;
          this._abort = new AbortController();
          const detach = { signal: this._abort.signal, preventCancel: true, preventClose: true, preventAbort: true };
          this._pipes = [
            this._options.stream.readable
              .pipeThrough(this._outgoingDelay, detach)
              .pipeTo(remote._options.stream.writable, detach),
            remote._options.stream.readable
              .pipeThrough(this._incomingDelay, detach)
              .pipeTo(this._options.stream.writable, detach),
          ];
          // A closed peer aborts these pipes; that is the normal end of the connection, not a fault.
          this._pipes.forEach((pipe) => void pipe.catch((err) => log('memory transport pipe ended', { err })));

          this.connected.emit();
          this._remoteConnection.connected.emit();
        })
        .catch((err) => {
          if (this._closed) {
            return;
          }

          this.errors.raise(err);
        });
    }
    return this;
  }

  async close(): Promise<this> {
    log('closing...');
    this._closed = true;
    this._remote.throw(new Error('Transport closed before the remote signal arrived.'));

    MemoryTransport._connections.delete(this._instanceId);
    if (this._remoteConnection) {
      this._remoteConnection._closed = true;
      MemoryTransport._connections.delete(this._remoteInstanceId);

      // Detach both directions. Cancelling the readables instead would destroy the wire-protocol
      // streams — including the peer's — where the `unpipe` this replaced only detached them.
      // Only the peer that won the connect race holds the pipes, and either peer may close first,
      // so both sides are torn down here rather than whichever one `close()` was called on.
      const remote = this._remoteConnection;
      const pipes = [...this._pipes, ...remote._pipes];
      this._pipes = [];
      remote._pipes = [];

      // Empty means the peer closed first and is draining these same pipes; aborting here would cut
      // that drain short, which is the loss the grace period exists to prevent.
      if (pipes.length > 0) {
        let drainTimer: NodeJS.Timeout | undefined;
        await Promise.race([
          Promise.allSettled(pipes),
          new Promise((resolve) => {
            drainTimer = setTimeout(resolve, PIPE_DRAIN_TIMEOUT);
          }),
        ]);
        clearTimeout(drainTimer);
        this._abort.abort();
        remote._abort.abort();
      }

      remote.closed.emit();
      remote._remoteConnection = undefined;
      this._remoteConnection = undefined;
    }

    this.closed.emit();
    log('closed');
    return this;
  }

  async onSignal({ payload }: Signal): Promise<void> {
    log('received signal', { payload });
    if (!payload?.transportId) {
      return;
    }

    // TODO(burdon): Check open?
    const transportId = payload.transportId as string;
    if (transportId) {
      const remoteId = PublicKey.fromHex(transportId);
      this._remote.wake(remoteId);
    }
  }

  async getDetails(): Promise<string> {
    return this._instanceId.toHex();
  }

  async getStats(): Promise<{
    bytesSent: number;
    bytesReceived: number;
    packetsSent: number;
    packetsReceived: number;
  }> {
    return {
      bytesSent: 0,
      bytesReceived: 0,
      packetsSent: 0,
      packetsReceived: 0,
    };
  }
}

// TODO(burdon): Factor out.
const toError = (err: any): Error => (err instanceof Error ? err : new Error(String(err)));
