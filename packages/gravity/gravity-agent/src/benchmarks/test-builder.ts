//
// Copyright 2023 DXOS.org
//

import { ConfigProto } from '@dxos/config';

import { Agent as GravityAgent } from '../agent';

export class TestBuilder {
  private readonly _peers = new Set<TestPeer>();

  createPeer<T extends TestPeer>({
    factory = () => {
      return new TestPeer(opts);
    }
  }: CreatePeerOpts<T>): T {
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
type CreatePeerOpts<T extends TestPeer> = {
  factory: () => T;
};

export type TestPeerParams = {
  config: ConfigProto;
};

export class TestPeer {
  public readonly agent: GravityAgent;

  constructor({ config }: TestPeerParams) {
    this.agent = new GravityAgent({ config });
  }

  destroy() {}
}
