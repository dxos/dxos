//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { ErrorStream } from '@dxos/debug';
import { Protocol } from '@dxos/protocol';
import { ComplexMap } from '@dxos/util';

import { SignalApi } from '../signal';
import { Transport, TransportFactory } from './transport';

const log = debug('dxos:network-manager:swarm:transport:in-memory-transport');

type ConnectionKey = [topic: PublicKey, nodeId: PublicKey, remoteId: PublicKey];

export class InMemoryTransport implements Transport {
  private static readonly _connections = new ComplexMap<ConnectionKey, InMemoryTransport>(([topic, nodeId, remoteId]) => topic.toHex() + nodeId.toHex() + remoteId.toHex());

  public readonly closed = new Event<void>();
  public readonly connected = new Event<void>();

  public readonly errors = new ErrorStream();

  private readonly _ownKey: ConnectionKey;
  private readonly _remoteKey: ConnectionKey;

  private _remoteConnection?: InMemoryTransport;

  constructor (
    private readonly _ownId: PublicKey,
    private readonly _remoteId: PublicKey,
    private readonly _sessionId: PublicKey,
    private readonly _topic: PublicKey,
    private readonly _protocol: Protocol
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
      this._protocol.stream.pipe(this._remoteConnection._protocol.stream).pipe(this._protocol.stream);

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
    await this._protocol.close();

    if (this._remoteConnection) {
      InMemoryTransport._connections.delete(this._remoteKey);

      await this._remoteConnection._protocol.close();

      const stream = this._protocol.stream;
      stream.unpipe?.(this._remoteConnection._protocol.stream)?.unpipe?.(stream); // TODO(rzadp): Find a way of unpiping this?

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
  opts.protocol
);
