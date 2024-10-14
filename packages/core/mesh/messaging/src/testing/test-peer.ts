//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type TestBuilder } from './test-builder';
import { expectPeerAvailable, expectPeerLeft, expectReceivedMessage } from './utils';
import { Messenger } from '../messenger';
import { type SignalManager } from '../signal-manager';
import { type Message, type PeerInfo } from '../signal-methods';

export class TestPeer extends Resource {
  public peerId = PublicKey.random();
  public identityKey = PublicKey.random();
  public signalManager!: SignalManager;
  public messenger!: Messenger;
  public defaultReceived = new Event<Message>();

  constructor(private readonly testBuilder: TestBuilder) {
    super();
  }

  get peerInfo(): PeerInfo {
    return {
      peerKey: this.peerId.toHex(),
      identityKey: this.identityKey.toHex(),
    };
  }

  async waitTillReceive(message: Message) {
    return expectReceivedMessage(this.defaultReceived, message);
  }

  async waitForPeerAvailable(topic: PublicKey, peer: PeerInfo) {
    return expectPeerAvailable(this.signalManager, topic, peer);
  }

  async waitForPeerLeft(topic: PublicKey, peer: PeerInfo) {
    return expectPeerLeft(this.signalManager, topic, peer);
  }

  protected override async _open() {
    this.signalManager = await this.testBuilder.createSignalManager(this.identityKey, this.peerId);
    this.messenger = new Messenger({ signalManager: this.signalManager, retryDelay: 300 });

    await this.signalManager.open();
    this.messenger.open();
    await this.messenger
      .listen({
        peer: this.peerInfo,
        onMessage: async (msg) => {
          this.defaultReceived.emit(msg);
        },
      })
      .catch((err) => log.catch(err));
  }

  protected override async _close() {
    await this.messenger.close();
    await this.signalManager.close();
  }
}
