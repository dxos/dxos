//
// Copyright 2022 DXOS.org
//

import { MemorySignalManager, MemorySignalManagerContext, type SignalManager } from '../signal-manager';
import { type Message } from '../signal-methods';

import { TestPeer } from './test-peer';

export type TestBuilderOptions = {
  signalManagerFactory?: (peer: TestPeer) => Promise<SignalManager>;
  messageDisruption?: (msg: Message) => Message[];
};

export class TestBuilder {
  private _signalContext = new MemorySignalManagerContext();
  private readonly _peers: TestPeer[] = [];

  constructor(public options: TestBuilderOptions) {}

  async createSignalManager(peer: TestPeer): Promise<SignalManager> {
    const signalManager =
      (await this.options.signalManagerFactory?.(peer)) ?? new MemorySignalManager(this._signalContext);

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

  async close(): Promise<void> {
    await Promise.all(this._peers.map((peer) => peer.close()));
  }
}
