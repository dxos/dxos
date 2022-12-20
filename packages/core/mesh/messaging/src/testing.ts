//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { Messenger } from './messenger';
import {
  SignalManager,
  MemorySignalManager,
  MemorySignalManagerContext,
  WebsocketSignalManager
} from './signal-manager';
import { Message } from './signal-methods';

export type TestBuilderOptions = {
  signalHosts?: string[];
  messageDisruption?: (msg: Message) => Message[];
};

export class TestBuilder {
  private _signalContext = new MemorySignalManagerContext();
  private readonly _peers: TestPeer[] = [];

  constructor(public options: TestBuilderOptions) {}

  createSignalManager() {
    let signalManager: SignalManager;
    if (this.options.signalHosts) {
      signalManager = new WebsocketSignalManager(this.options.signalHosts);
    } else {
      signalManager = new MemorySignalManager(this._signalContext);
    }

    if (this.options.messageDisruption) {
      // Imitates signal network disruptions (e. g. message doubling, ).
      const trueSend = signalManager.sendMessage.bind(signalManager);
      signalManager.sendMessage = async (message) => {
        for (const msg of this.options.messageDisruption!(message)) {
          await trueSend(msg);
        }
      };
    }

    return signalManager;
  }

  createPeer(): TestPeer {
    const peer = new TestPeer(this);
    this._peers.push(peer);
    return peer;
  }

  async close() {
    await Promise.all(this._peers.map((peer) => peer.close()));
  }
}

export class TestPeer {
  public peerId = PublicKey.random();
  public signalManager: SignalManager;
  public messenger: Messenger;
  public defaultReceived = new Event<Message>();

  constructor(private readonly testBuilder: TestBuilder) {
    this.signalManager = testBuilder.createSignalManager();
    this.messenger = new Messenger({ signalManager: this.signalManager });
    this.messenger
      .listen({
        peerId: this.peerId,
        onMessage: async (msg) => {
          this.defaultReceived.emit(msg);
        }
      })
      .catch((err) => log.catch(err));
  }

  waitTillReceive(message: Message) {
    return this.defaultReceived.waitFor(
      (msg) =>
        msg.author.equals(message.author) &&
        msg.recipient.equals(message.recipient) &&
        msg.payload.value.every((value, index) => value === message.payload.value[index])
    );
  }

  async close() {
    await this.signalManager.close();
    this.messenger.close();
  }
}
