//
// Copyright 2022 DXOS.org
//

import { type PublicKey } from '@dxos/keys';

import { TestPeer } from './test-peer';
import { type SignalManager, MemorySignalManager, MemorySignalManagerContext } from '../signal-manager';
import { type Message } from '../signal-methods';

export type TestBuilderOptions = {
  signalManagerFactory?: (identityKey: PublicKey, deviceKey: PublicKey) => Promise<SignalManager>;
  messageDisruption?: (msg: Message) => Message[];
};

export class TestBuilder {
  private _signalContext = new MemorySignalManagerContext();
  private readonly _peers: TestPeer[] = [];

  constructor(public options: TestBuilderOptions) {}

  async createSignalManager(identityKey: PublicKey, deviceKey: PublicKey) {
    const signalManager =
      (await this.options.signalManagerFactory?.(identityKey, deviceKey)) ??
      new MemorySignalManager(this._signalContext);

    if (this.options.messageDisruption) {
      // Imitates signal network disruptions (e. g. message doubling, ).
      const trueSend = signalManager.sendMessage.bind(signalManager);
      signalManager.sendMessage = async (message: Message) => {
        for (const msg of this.options.messageDisruption!(message)) {
          await trueSend(msg);
        }
      };
    }

    return signalManager;
  }

  async createPeer(): Promise<TestPeer> {
    const peer = new TestPeer(this);
    await peer.open();
    this._peers.push(peer);
    return peer;
  }

  async createPeers(count: number): Promise<TestPeer[]> {
    return Promise.all(Array.from({ length: count }, () => this.createPeer()));
  }

  async close() {
    await Promise.all(this._peers.map((peer) => peer.close()));
  }
}
