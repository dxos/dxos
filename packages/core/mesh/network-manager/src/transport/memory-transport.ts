//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';
import { Transform } from 'stream';

import { Event } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { ComplexMap } from '@dxos/util';

import { Transport, TransportFactory } from './transport';

type ConnectionKey = [topic: PublicKey, nodeId: PublicKey, remoteId: PublicKey];

// Delay (in milliseconds) for data being sent through in-memory connections to simulate network latency.
const MEMORY_TRANSPORT_DELAY = 1;

/**
 * Creates a binary stream that delays data being sent through the stream by the specified amount of time.
 */
const createStreamDelay = (delay: number): NodeJS.ReadWriteStream =>
  new Transform({
    objectMode: true,
    transform: (chunk, _, cb) => {
      setTimeout(() => cb(null, chunk), delay); // TODO(burdon): Randomize.
    }
  });

/**
 * Fake transport.
 */
// TODO(burdon): Remove static variables.
export class MemoryTransport implements Transport {
  // TODO(burdon): Remove global properties.
  private static readonly _connections = new ComplexMap<ConnectionKey, MemoryTransport>(
    ([topic, nodeId, remoteId]) => topic.toHex() + nodeId.toHex() + remoteId.toHex()
  );

  public readonly closed = new Event<void>();
  public readonly connected = new Event<void>();
  public readonly errors = new ErrorStream();

  private readonly _ownKey: ConnectionKey;
  private readonly _remoteKey: ConnectionKey;

  private readonly _outgoingDelay = createStreamDelay(MEMORY_TRANSPORT_DELAY);
  private readonly _incomingDelay = createStreamDelay(MEMORY_TRANSPORT_DELAY);

  private _remoteConnection?: MemoryTransport;

  constructor(
    private readonly _ownId: PublicKey,
    private readonly _remoteId: PublicKey,
    private readonly _sessionId: PublicKey,
    private readonly _topic: PublicKey,
    private readonly _stream: NodeJS.ReadWriteStream
  ) {
    log('creating', { topic: this._topic, peerId: this._ownId, remoteId: this._remoteId });

    this._ownKey = [this._topic, this._ownId, this._remoteId];
    this._remoteKey = [this._topic, this._remoteId, this._ownId];

    assert(!MemoryTransport._connections.has(this._ownKey), 'Duplicate memory connection');
    MemoryTransport._connections.set(this._ownKey, this);

    this._remoteConnection = MemoryTransport._connections.get(this._remoteKey);
    if (this._remoteConnection) {
      this._remoteConnection._remoteConnection = this;

      log('connected', { topic: this._topic, peerId: this._ownId, remoteId: this._remoteId });
      this._stream
        .pipe(this._outgoingDelay)
        .pipe(this._remoteConnection._stream)
        .pipe(this._incomingDelay)
        .pipe(this._stream);

      this.connected.emit();
      this._remoteConnection.connected.emit();
    }
  }

  get remoteId(): PublicKey {
    return this._remoteId;
  }

  get sessionId(): PublicKey {
    return this._sessionId;
  }

  async signal(signal: Signal) {
    // No-op.
  }

  async close(): Promise<void> {
    log('closing', { topic: this._topic, peerId: this._ownId, remoteId: this._remoteId });

    MemoryTransport._connections.delete(this._ownKey);
    if (this._remoteConnection) {
      MemoryTransport._connections.delete(this._remoteKey);

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
    }

    this.closed.emit();
    log('closed', { topic: this._topic });
  }
}

export const MemoryTransportFactory: TransportFactory = {
  create: (opts) => new MemoryTransport(opts.ownId, opts.remoteId, opts.sessionId, opts.topic, opts.stream)
};
