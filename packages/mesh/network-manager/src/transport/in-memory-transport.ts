//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { PublicKey } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';
import { ComplexMap, ErrorStream, Event } from '@dxos/util';

import { SignalApi } from '../signal';
import { Transport, TransportState, TransportFactory } from './transport';

const log = debug('dxos:network-manager:swarm:in-memory-connection');

export class InMemoryTransport implements Transport {
  private static readonly _connections = new ComplexMap<[topic: PublicKey, nodeId: PublicKey, remoteId: PublicKey], InMemoryTransport>(([topic, nodeId, remoteId]) => topic.toHex() + nodeId.toHex() + remoteId.toHex());

  public readonly stateChanged = new Event<TransportState>();
  public readonly closed = new Event<void>();

  public readonly errors = new ErrorStream();

  public state: TransportState = TransportState.INITIAL;

  private _remoteConnection?: InMemoryTransport;

  constructor (
    private readonly _ownId: PublicKey,
    private readonly _remoteId: PublicKey,
    private readonly _sessionId: PublicKey,
    private readonly _topic: PublicKey,
    private readonly _protocol: Protocol
  ) {
    log(`Created in-memory connection ${this._ownId} -> ${this._remoteId}`);
  }

  get remoteId (): PublicKey {
    return this._remoteId;
  }

  get sessionId (): PublicKey {
    return this._sessionId;
  }

  connect () {
    assert(this.state === TransportState.INITIAL, 'Invalid state');

    log(`Registering connection topic=${this._topic} peerId=${this._ownId} remoteId=${this._remoteId}`);

    assert(!InMemoryTransport._connections.has([this._topic, this._ownId, this._remoteId]), 'Duplicate in-memory connection');
    InMemoryTransport._connections.set([this._topic, this._ownId, this._remoteId], this);

    this._remoteConnection = InMemoryTransport._connections.get([this._topic, this._remoteId, this._ownId]);
    if (this._remoteConnection) {
      log(`Connecting to existing connection topic=${this._topic} peerId=${this._ownId} remoteId=${this._remoteId}`);
      this._protocol.stream.pipe(this._remoteConnection._protocol.stream).pipe(this._protocol.stream);

      this.state = TransportState.CONNECTED;
      this.stateChanged.emit(this.state);
      this._remoteConnection.state = TransportState.CONNECTED;
      this._remoteConnection.stateChanged.emit(this._remoteConnection.state);
    }
  }

  signal (msg: SignalApi.SignalMessage): void {
    // Does nothing.
  }

  async close (): Promise<void> {
    if (this.state === TransportState.CLOSED) {
      return;
    }

    log(`Closing connection topic=${this._topic} peerId=${this._ownId} remoteId=${this._remoteId}`);

    InMemoryTransport._connections.delete([this._topic, this._ownId, this._remoteId]);

    this.state = TransportState.CLOSED;
    this.stateChanged.emit(this.state);

    if (this._remoteConnection) {
      InMemoryTransport._connections.delete([this._topic, this._remoteId, this._ownId]);

      const stream = this._protocol.stream;
      stream.unpipe(this._remoteConnection._protocol.stream).unpipe(stream);

      this._remoteConnection.state = TransportState.CLOSED;
      this._remoteConnection.stateChanged.emit(this._remoteConnection.state);

      this._remoteConnection.close();
      this._remoteConnection = undefined;
    }
  }
}

export const inMemoryTransportFactory: TransportFactory = opts => new InMemoryTransport(
  opts.ownId,
  opts.remoteId,
  opts.sessionId,
  opts.topic,
  opts.protocol
);
