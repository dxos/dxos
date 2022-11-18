//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';
import { Transform } from 'stream';

import { Event, Trigger } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { ComplexMap } from '@dxos/util';

import { Transport, TransportFactory, TransportOptions } from './transport';

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
    }
  });
};

export const MemoryTransportFactory: TransportFactory = {
  createTransport: (params) => new MemoryTransport(params)
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

  private readonly _id = PublicKey.random(); // TODO(burdon): Rename peerId? (Use local/remote labels in logs).
  private readonly _remote = new Trigger<PublicKey>();

  private readonly _outgoingDelay = createStreamDelay(MEMORY_TRANSPORT_DELAY);
  private readonly _incomingDelay = createStreamDelay(MEMORY_TRANSPORT_DELAY);

  private _destroyed = false;
  private _remoteId!: PublicKey;
  private _remoteConnection?: MemoryTransport;

  constructor(private readonly options: TransportOptions) {
    log('creating', { id: this._id });

    assert(!MemoryTransport._connections.has(this._id), 'Duplicate memory connection');
    MemoryTransport._connections.set(this._id, this);

    // Initiator will send a signal, the receiver will receive the unique ID and connect the streams.
    if (this.options.initiator) {
      // prettier-ignore
      setTimeout(async () => {
        log('sending signal', { transportId: this._id });
        void this.options.sendSignal({
          json: JSON.stringify({ transportId: this._id.toHex() })
        });
    });
    } else {
      this._remote
        .wait({ timeout: this.options.timeout ?? 1000 })
        .then((remoteId) => {
          if (this._destroyed) {
            return;
          }

          this._remoteId = remoteId;
          this._remoteConnection = MemoryTransport._connections.get(this._remoteId);
          if (!this._remoteConnection) {
            // Remote connection was destroyed before we could connect.
            this._destroyed = true;
            this.closed.emit();
            return;
          }

          assert(!this._remoteConnection._remoteConnection, new Error(`Remote already connected: ${this._remoteId}`));
          this._remoteConnection._remoteConnection = this;
          this._remoteConnection._remoteId = this._id;

          log('connected', { id: this._id, remote: this._remoteId });
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

  async destroy(): Promise<void> {
    log('closing', { id: this._id });
    this._destroyed = true;

    MemoryTransport._connections.delete(this._id);
    if (this._remoteConnection) {
      log('closing', { id: this._remoteId });
      this._remoteConnection._destroyed = true;
      MemoryTransport._connections.delete(this._remoteId);

      // TODO(dmaretskyi): Hypercore streams do not seem to have the unpipe method.
      //  NOTE(burdon): Using readable-stream.wrap() might help (see feed-store).
      // code this._stream
      // code   .unpipe(this._outgoingDelay)
      // code   .unpipe(this._remoteConnection._stream)
      // code   .unpipe(this._incomingDelay)
      // code   .unpipe(this._stream);

      this._outgoingDelay.unpipe();
      this._incomingDelay.unpipe();

      this._remoteConnection.closed.emit();
      this._remoteConnection._remoteConnection = undefined;
      this._remoteConnection = undefined;
      log('closed', { id: this._remoteId });
    }

    this.closed.emit();
    log('closed', { id: this._id });
  }

  signal(signal: Signal) {
    const { json } = signal;
    if (json) {
      // TODO(burdon): Check open?
      const { transportId } = JSON.parse(json);
      if (transportId) {
        const remoteId = PublicKey.fromHex(transportId);
        log('received signal', { id: this._id, remoteId });
        this._remote.wake(remoteId);
      }
    }
  }
}
