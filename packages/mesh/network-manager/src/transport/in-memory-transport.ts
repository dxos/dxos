//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';
import { Transform } from 'stream';

import { Event } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/protocols';
import { ComplexMap } from '@dxos/util';

import { NetworkMessage } from '../proto/gen/dxos/mesh/networkMessage';
import { Transport, TransportFactory } from './transport';

const log = debug('dxos:network-manager:swarm:transport:in-memory-transport');

type ConnectionKey = [topic: PublicKey, nodeId: PublicKey, remoteId: PublicKey]

// Delay (in milliseconds) for data being sent through in-memory connections to simulate network latency.
const IN_MEMORY_TRANSPORT_DELAY = 1;

// TODO(burdon): Rename.
export class InMemoryTransport implements Transport {

  // TODO(burdon): Remove global properties.
  private static readonly _connections = new ComplexMap<ConnectionKey, InMemoryTransport>(
    ([topic, nodeId, remoteId]) => topic.toHex() + nodeId.toHex() + remoteId.toHex());

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

  async signal (msg: NetworkMessage) {
    // No-op.
  }

  async close (): Promise<void> {
    log(`Closing connection topic=${this._topic} peerId=${this._ownId} remoteId=${this._remoteId}`);

    InMemoryTransport._connections.delete(this._ownKey);

    if (this._remoteConnection) {
      InMemoryTransport._connections.delete(this._remoteKey);

      // TODO(marik-d): Hypercore streams do not seem to have the unpipe method.
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
    log('Closed.');
  }
}

// TODO(burdon): Remove.
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
const createStreamDelay = (delay: number): NodeJS.ReadWriteStream => new Transform({
  objectMode: true,
  transform: (chunk, enc, cb) => {
    setTimeout(() => cb(null, chunk), delay);
  }
});
