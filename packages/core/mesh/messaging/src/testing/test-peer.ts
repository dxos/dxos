//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { createDidFromIdentityKey } from '@dxos/credentials';
import { PeerSchema } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { type IdentityDid, PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';

import { Messenger } from '../messenger';
import { type SignalManager } from '../signal-manager';
import { type Message, type PeerInfo } from '../signal-methods';
import { type TestBuilder } from './test-builder';
import { expectPeerAvailable, expectPeerLeft, expectReceivedMessage } from './utils';

export class TestPeer extends Resource {
  /**
   * Undefined until `_open()`: a `createSignalManager` factory (e.g. edge's) may install its own
   * signer-backed key, otherwise a random one is generated. Read via {@link peerInfo} after opening.
   */
  public peerId?: PublicKey;
  public signalManager!: SignalManager;
  public messenger!: Messenger;
  public defaultReceived = new Event<Message>();

  /** DID derived from {@link peerId} in `_open()`, mirroring `createDeviceEdgeIdentity`. */
  private _identityDid?: IdentityDid;

  constructor(private readonly testBuilder: TestBuilder) {
    super();
  }

  get peerInfo(): PeerInfo {
    invariant(this.peerId && this._identityDid, 'TestPeer not open');
    return buf.create(PeerSchema, { peerKey: this.peerId.toHex(), identityDid: this._identityDid });
  }

  async waitTillReceive(message: Message): Promise<Message> {
    return expectReceivedMessage(this.defaultReceived, message);
  }

  async waitForPeerAvailable(topic: PublicKey, peer: PeerInfo) {
    return expectPeerAvailable(this.signalManager, topic, peer);
  }

  async waitForPeerLeft(topic: PublicKey, peer: PeerInfo) {
    return expectPeerLeft(this.signalManager, topic, peer);
  }

  protected override async _open(): Promise<void> {
    // `createSignalManager` (e.g. edge's factory) may populate `peerId` with its own signer-backed
    // key; otherwise fall back to a random one. Derive the DID only after `peerId` is settled.
    this.signalManager = await this.testBuilder.createSignalManager(this);
    this.peerId ??= PublicKey.random();
    this._identityDid = await createDidFromIdentityKey(this.peerId);
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

  protected override async _close(): Promise<void> {
    await this.messenger.close();
    await this.signalManager.close();
  }
}
