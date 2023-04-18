//
// Copyright 2022 DXOS.org
//

import { Peer } from './peer';

type CreatePeerOpts<T extends Peer> = {
  factory: () => T;
};

export class Builder {
  private readonly _peers = new Set<Peer>();

  createPeer<T extends Peer>(opts: CreatePeerOpts<T>): T {
    const peer = opts.factory();
    this._peers.add(peer);
    return peer;
  }

  *createPeers<T extends Peer>(opts: CreatePeerOpts<T>): Generator<T> {
    while (true) {
      yield this.createPeer(opts);
    }
  }

  async destroy() {
    await Promise.all(Array.from(this._peers).map((agent) => agent.destroy()));
  }
}
