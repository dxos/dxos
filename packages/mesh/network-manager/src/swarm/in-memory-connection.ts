//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { PublicKey } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';
import { ComplexMap, ErrorStream, Event } from '@dxos/util';

import { SignalApi } from '../signal';
import { Connection, ConnectionState, ConnectionFactory } from './connection';

const log = debug('dxos:network-manager:swarm:in-memory-connection');

export class InMemoryConnection implements Connection {
  private static readonly _connections = new ComplexMap<[topic: PublicKey, nodeId: PublicKey, remoteId: PublicKey], InMemoryConnection>(([topic, nodeId, remoteId]) => topic.toHex() + nodeId.toHex() + remoteId.toHex());

  public readonly stateChanged = new Event<ConnectionState>();
  public readonly closed = new Event<void>();

  public readonly errors = new ErrorStream();

  public state: ConnectionState = ConnectionState.INITIAL;

  private _remoteConnection?: InMemoryConnection;

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
    assert(this.state === ConnectionState.INITIAL, 'Invalid state');

    log(`Registering connection topic=${this._topic} peerId=${this._ownId} remoteId=${this._remoteId}`);

    assert(!InMemoryConnection._connections.has([this._topic, this._ownId, this._remoteId]), 'Duplicate in-memory connection');
    InMemoryConnection._connections.set([this._topic, this._ownId, this._remoteId], this);

    this._remoteConnection = InMemoryConnection._connections.get([this._topic, this._remoteId, this._ownId]);
    if (this._remoteConnection) {
      log(`Connecting to existing connection topic=${this._topic} peerId=${this._ownId} remoteId=${this._remoteId}`);
      this._protocol.stream.pipe(this._remoteConnection._protocol.stream).pipe(this._protocol.stream);

      this.state = ConnectionState.CONNECTED;
      this.stateChanged.emit(this.state);
      this._remoteConnection.state = ConnectionState.CONNECTED;
      this._remoteConnection.stateChanged.emit(this._remoteConnection.state);
    }
  }

  signal (msg: SignalApi.SignalMessage): void {
    // Does nothing.
  }

  async close (): Promise<void> {
    if (this.state === ConnectionState.CLOSED) {
      return;
    }

    log(`Closing connection topic=${this._topic} peerId=${this._ownId} remoteId=${this._remoteId}`);

    InMemoryConnection._connections.delete([this._topic, this._ownId, this._remoteId]);

    this.state = ConnectionState.CLOSED;
    this.stateChanged.emit(this.state);

    if (this._remoteConnection) {
      InMemoryConnection._connections.delete([this._topic, this._remoteId, this._ownId]);

      const stream = this._protocol.stream;
      stream.unpipe(this._remoteConnection._protocol.stream).unpipe(stream);

      this._remoteConnection.state = ConnectionState.CLOSED;
      this._remoteConnection.stateChanged.emit(this._remoteConnection.state);

      this._remoteConnection.close();
      this._remoteConnection = undefined;
    }
  }
}

export const inMemoryConnectionFactory: ConnectionFactory = opts => new InMemoryConnection(
  opts.ownId,
  opts.remoteId,
  opts.sessionId,
  opts.topic,
  opts.protocol
);
