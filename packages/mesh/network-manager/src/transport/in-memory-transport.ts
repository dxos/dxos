//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import { Transform } from 'stream';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { ErrorStream } from '@dxos/debug';
import { ComplexMap } from '@dxos/util';

import { SignalApi } from '../signal';
import { Transport, TransportFactory } from './transport';

const log = debug('dxos:network-manager:swarm:transport:in-memory-transport');

type ConnectionKey = [topic: PublicKey, nodeId: PublicKey, remoteId: PublicKey];

// Delay (in milliseconds) for data being sent through in-memory connections to simulate network latency.
const IN_MEMORY_TRANSPORT_DELAY = 1;

export class InMemoryTransport implements Transport {
  private static readonly _connections = new ComplexMap<ConnectionKey, InMemoryTransport>(([topic, nodeId, remoteId]) => topic.toHex() + nodeId.toHex() + remoteId.toHex());

  public readonly closed = new Event<void>();
  public readonly connected = new Event<void>();

  public readonly errors = new ErrorStream();

  private readonly _ownKey: ConnectionKey;
  private readonly _remoteKey: ConnectionKey;

  private readonly _outgoingDelay = createStreamDelay(IN_MEMORY_TRANSPORT_DELAY);
  private readonly _incomingDelay = createStreamDelay(IN_MEMORY_TRANSPORT_DELAY);

  private _remoteConnection?: InMemoryTransport;

  constructor (
    private readonly _ownId: PublicKey,
    private readonly _remoteId: PublicKey,
    private readonly _sessionId: PublicKey,
    private readonly _topic: PublicKey,
    private readonly _stream: NodeJS.ReadWriteStream
  ) {
    log(`Registering connection topic=${this._topic} peerId=${this._ownId} remoteId=${this._remoteId}`);

    this._ownKey = [this._topic, this._ownId, this._remoteId];
    this._remoteKey = [this._topic, this._remoteId, this._ownId];

    assert(!InMemoryTransport._connections.has(this._ownKey), 'Duplicate in-memory connection');
    InMemoryTransport._connections.set(this._ownKey, this);

    this._remoteConnection = InMemoryTransport._connections.get(this._remoteKey);
    if (this._remoteConnection) {
      this._remoteConnection._remoteConnection = this;

      log(`Connecting to existing connection topic=${this._topic} peerId=${this._ownId} remoteId=${this._remoteId}`);
      this._stream
        .pipe(this._outgoingDelay)
        .pipe(this._remoteConnection._stream)
        .pipe(this._incomingDelay)
        .pipe(this._stream);

      this.connected.emit();
      this._remoteConnection.connected.emit();
    }
  }

  get remoteId (): PublicKey {
    return this._remoteId;
  }

  get sessionId (): PublicKey {
    return this._sessionId;
  }

  signal (msg: SignalApi.SignalMessage): void {
    // Does nothing.
  }

  async close (): Promise<void> {
    log(`Closing connection topic=${this._topic} peerId=${this._ownId} remoteId=${this._remoteId}`);

    InMemoryTransport._connections.delete(this._ownKey);

    if (this._remoteConnection) {
      InMemoryTransport._connections.delete(this._remoteKey);

      // TODO(marik-d): Hypercore streams do not seem to have the unpipe method.
      // this._stream
      //   .unpipe(this._outgoingDelay)
      //   .unpipe(this._remoteConnection._stream)
      //   .unpipe(this._incomingDelay)
      //   .unpipe(this._stream);

      this._outgoingDelay.unpipe();
      this._incomingDelay.unpipe();

      this._remoteConnection.closed.emit();

      this._remoteConnection._remoteConnection = undefined;
      this._remoteConnection = undefined;
    }

    this.closed.emit();
    log('Closed.');
  }
}

export const inMemoryTransportFactory: TransportFactory = opts => new InMemoryTransport(
  opts.ownId,
  opts.remoteId,
  opts.sessionId,
  opts.topic,
  opts.stream
);

/**
 * Creates a binary stream that delays data being sent through the stream by the specified amount of time.
 */
function createStreamDelay (delay: number): NodeJS.ReadWriteStream {
  return new Transform({
    objectMode: true,
    transform: (chunk, enc, cb) => {
      setTimeout(() => cb(null, chunk), delay);
    }
  });
}
