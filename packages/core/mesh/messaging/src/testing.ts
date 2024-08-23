//
// Copyright 2022 DXOS.org
//

import { asyncTimeout, Event } from '@dxos/async';
import { type Any } from '@dxos/codec-protobuf';
import { Resource } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { Messenger } from './messenger';
import { type SignalManager, MemorySignalManager, MemorySignalManagerContext } from './signal-manager';
import { type SignalMethods, type Message, type PeerInfo } from './signal-methods';

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
    this.messenger = new Messenger({ signalManager: this.signalManager });

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

export const expectPeerAvailable = (client: SignalMethods, expectedTopic: PublicKey, peer: PeerInfo) =>
  asyncTimeout(
    client.swarmEvent.waitFor(
      ({ peerAvailable, topic }) =>
        !!peerAvailable && peer.peerKey === peerAvailable.peer && expectedTopic.equals(topic),
    ),
    1000,
  );

export const expectPeerLeft = (client: SignalMethods, expectedTopic: PublicKey, peer: PeerInfo) =>
  asyncTimeout(
    client.swarmEvent.waitFor(
      ({ peerLeft, topic }) => !!peerLeft && peer.peerKey === peerLeft.peer && expectedTopic.equals(topic),
    ),
    1000,
  );

export const expectReceivedMessage = (event: Event<Message>, expectedMessage: Message) => {
  return asyncTimeout(
    event.waitFor(
      (msg) =>
        msg.author.peerKey === expectedMessage.author.peerKey &&
        msg.recipient.peerKey === expectedMessage.recipient.peerKey &&
        PublicKey.from(msg.payload.value).equals(expectedMessage.payload.value),
    ),
    5000,
  );
};

export const PAYLOAD: Any = { type_url: 'google.protobuf.Any', value: Uint8Array.from([1, 2, 3]) };

export const createMessage = (author: PeerInfo, recipient: PeerInfo, payload: Any = PAYLOAD): Message => ({
  author,
  recipient,
  payload,
});
