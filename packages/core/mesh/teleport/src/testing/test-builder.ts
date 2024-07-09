//
// Copyright 2022 DXOS.org
//

import { type Duplex, pipeline } from 'node:stream';

import { waitForCondition } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { Teleport } from '../teleport';

type CreatePeerOpts<T extends TestPeer> = {
  factory: () => T;
};

export class TestBuilder {
  private readonly _peers = new Set<TestPeer>();

  createPeer<T extends TestPeer>(opts: CreatePeerOpts<T>): T {
    const peer = opts.factory();
    this._peers.add(peer);
    return peer;
  }

  *createPeers<T extends TestPeer>(opts: CreatePeerOpts<T>): Generator<T> {
    while (true) {
      yield this.createPeer(opts);
    }
  }

  async destroy() {
    await Promise.all(Array.from(this._peers).map((agent) => agent.destroy()));
  }

  async connect(peer1: TestPeer, peer2: TestPeer) {
    invariant(peer1 !== peer2);
    invariant(this._peers.has(peer1));
    invariant(this._peers.has(peer1));

    const connection1 = peer1.createConnection({ initiator: true, remotePeerId: peer2.peerId });
    const connection2 = peer2.createConnection({ initiator: false, remotePeerId: peer1.peerId });

    pipeStreams(connection1.teleport.stream, connection2.teleport.stream);
    await Promise.all([peer1.openConnection(connection1), peer2.openConnection(connection2)]);

    return [connection1, connection2];
  }

  async disconnect(peer1: TestPeer, peer2: TestPeer) {
    invariant(peer1 !== peer2);
    invariant(this._peers.has(peer1));
    invariant(this._peers.has(peer1));

    const connection1 = Array.from(peer1.connections).find((connection) =>
      connection.remotePeerId.equals(peer2.peerId),
    );
    const connection2 = Array.from(peer2.connections).find((connection) =>
      connection.remotePeerId.equals(peer1.peerId),
    );

    invariant(connection1);
    invariant(connection2);

    await Promise.all([peer1.closeConnection(connection1), peer2.closeConnection(connection2)]);
  }
}

export class TestPeer {
  public readonly connections = new Set<TestConnection>();

  constructor(public readonly peerId: PublicKey = PublicKey.random()) {}

  protected async onOpen(connection: TestConnection) {}
  protected async onClose(connection: TestConnection) {}

  createConnection({ initiator, remotePeerId }: { initiator: boolean; remotePeerId: PublicKey }) {
    const connection = new TestConnection(this.peerId, remotePeerId, initiator);
    this.connections.add(connection);
    return connection;
  }

  async openConnection(connection: TestConnection) {
    invariant(this.connections.has(connection));
    await connection.teleport.open(PublicKey.random());
    await this.onOpen(connection);
  }

  async closeConnection(connection: TestConnection) {
    invariant(this.connections.has(connection));
    await this.onClose(connection);
    await connection.teleport.close();
    this.connections.delete(connection);
  }

  async destroy() {
    for (const teleport of this.connections) {
      await this.closeConnection(teleport);
    }
  }
}

const pipeStreams = (stream1: Duplex, stream2: Duplex) => {
  pipeline(stream1, stream2, (err) => {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      log.catch(err);
    }
  });
  pipeline(stream2, stream1, (err) => {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      log.catch(err);
    }
  });
};

export class TestConnection {
  public teleport: Teleport;

  constructor(
    public readonly localPeerId: PublicKey,
    public readonly remotePeerId: PublicKey,
    public readonly initiator: boolean,
  ) {
    this.teleport = new Teleport({
      initiator,
      localPeerId,
      remotePeerId,
    });
  }

  public whenOpen(open: boolean) {
    return waitForCondition({ condition: () => this.teleport.isOpen === open });
  }
}
