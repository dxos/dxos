//
// Copyright 2020 DXOS.org
//

import { Transform } from 'node:stream';

import { Event, Trigger } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { type Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { ComplexMap } from '@dxos/util';

import { type Transport, type TransportFactory, type TransportOptions, type TransportStats } from './transport';

// TODO(burdon): Make configurable.
// Delay (in milliseconds) for data being sent through in-memory connections to simulate network latency.
const MEMORY_TRANSPORT_DELAY = 1;

/**
 * Creates a binary stream that delays data being sent through the stream by the specified amount of time.
 */
const createStreamDelay = (delay: number): NodeJS.ReadWriteStream => {
  return new Transform({
    objectMode: true,
    transform: (chunk, _, cb) => {
      setTimeout(() => cb(null, chunk), delay); // TODO(burdon): Randomize.
    },
  });
};

export const MemoryTransportFactory: TransportFactory = {
  createTransport: (params) => new MemoryTransport(params),
};

/**
 * Fake transport.
 */
export class MemoryTransport implements Transport {
  // TODO(burdon): Remove static properties (inject context into constructor).
  private static readonly _connections = new ComplexMap<PublicKey, MemoryTransport>(PublicKey.hash);

  public readonly closed = new Event<void>();
  public readonly connected = new Event<void>();
  public readonly errors = new ErrorStream();

  @logInfo
  private readonly _instanceId = PublicKey.random(); // TODO(burdon): Rename peerId? (Use local/remote labels in logs).

  private readonly _remote = new Trigger<PublicKey>();

  private readonly _outgoingDelay = createStreamDelay(MEMORY_TRANSPORT_DELAY);
  private readonly _incomingDelay = createStreamDelay(MEMORY_TRANSPORT_DELAY);

  private _destroyed = false;

  @logInfo
  private _remoteInstanceId!: PublicKey;

  private _remoteConnection?: MemoryTransport;

  constructor(private readonly options: TransportOptions) {
    log('creating');

    invariant(!MemoryTransport._connections.has(this._instanceId), 'Duplicate memory connection');
    MemoryTransport._connections.set(this._instanceId, this);

    // Initiator will send a signal, the receiver will receive the unique ID and connect the streams.
    if (this.options.initiator) {
      setTimeout(async () => {
        log('sending signal');
        void this.options
          .sendSignal({
            payload: { transportId: this._instanceId.toHex() },
          })
          .catch((err) => {
            if (!this._destroyed) {
              this.errors.raise(err);
            }
          });
      });
    } else {
      this._remote
        .wait({ timeout: this.options.timeout ?? 1000 })
        .then((remoteId) => {
          if (this._destroyed) {
            return;
          }

          this._remoteInstanceId = remoteId;
          this._remoteConnection = MemoryTransport._connections.get(this._remoteInstanceId);
          if (!this._remoteConnection) {
            // Remote connection was destroyed before we could connect.
            this._destroyed = true;
            this.closed.emit();
            return;
          }

          invariant(!this._remoteConnection._remoteConnection, `Remote already connected: ${this._remoteInstanceId}`);
          this._remoteConnection._remoteConnection = this;
          this._remoteConnection._remoteInstanceId = this._instanceId;

          log('connected');
          this.options.stream
            .pipe(this._outgoingDelay)
            .pipe(this._remoteConnection.options.stream)
            .pipe(this._incomingDelay)
            .pipe(this.options.stream);

          this.connected.emit();
          this._remoteConnection.connected.emit();
        })
        .catch((err) => {
          if (this._destroyed) {
            return;
          }

          this.errors.raise(err);
        });
    }
  }

  async open() {}

  async destroy(): Promise<void> {
    log('closing');
    this._destroyed = true;

    MemoryTransport._connections.delete(this._instanceId);
    if (this._remoteConnection) {
      log('closing');
      this._remoteConnection._destroyed = true;
      MemoryTransport._connections.delete(this._remoteInstanceId);

      // TODO(dmaretskyi): Hypercore streams do not seem to have the unpipe method.
      //  NOTE(burdon): Using readable-stream.wrap() might help (see feed-store).
      // code this._stream
      // code   .unpipe(this._outgoingDelay)
      // code   .unpipe(this._remoteConnection._stream)
      // code   .unpipe(this._incomingDelay)
      // code   .unpipe(this._stream);

      this.options.stream.unpipe(this._incomingDelay);
      this._incomingDelay.unpipe(this._remoteConnection.options.stream);
      this._remoteConnection.options.stream.unpipe(this._outgoingDelay);
      this._outgoingDelay.unpipe(this.options.stream);
      this.options.stream.unpipe(this._outgoingDelay);

      this._remoteConnection.closed.emit();
      this._remoteConnection._remoteConnection = undefined;
      this._remoteConnection = undefined;
      log('closed');
    }

    this.closed.emit();
    log('closed');
  }

  signal({ payload }: Signal) {
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

  async getStats(): Promise<TransportStats> {
    return {
      bytesSent: 0,
      bytesReceived: 0,
      packetsSent: 0,
      packetsReceived: 0,
    };
  }
}
