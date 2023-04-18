//
// Copyright 2022 DXOS.org
//

import { TestPeer } from './test-peer';

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
}
