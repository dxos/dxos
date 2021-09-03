//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Keyring, KeyType } from '@dxos/credentials';
import { PublicKey, createKeyPair } from '@dxos/crypto';
import {
  codec, createIterator, FeedKey, FeedStoreIterator, MessageSelector, PartyKey, Timeframe
} from '@dxos/echo-protocol';
import { FeedStore, HypercoreFeed } from '@dxos/feed-store';
import { IStorage } from '@dxos/random-access-multi-storage';

/**
 * An adapter class to better define the API surface of FeedStore we use.
 * Generally, all ECHO classes should use this intead of an actual FeedStore.
 */
// TODO(burdon): Temporary: will replace FeedStore.
export class FeedStoreAdapter {
  static create (storage: IStorage, keyring: Keyring) {
    return new FeedStoreAdapter(new FeedStore(storage, { valueEncoding: codec }), keyring);
  }

  constructor (
    private readonly _feedStore: FeedStore,
    private readonly _keyring: Keyring
  ) {}

  // TODO(burdon): Remove.
  get feedStore () {
    return this._feedStore;
  }

  get storage () {
    return this._feedStore.storage;
  }

  async open () {
    if (!this._feedStore.opened) {
      await this._feedStore.open(this._keyring.keys);
    }

    // TODO(telackey): There may be a better way to do this, but at the moment,
    // we don't have any feeds we don't need to be open.
    for (const descriptor of this._feedStore.getDescriptors()) {
      if (!descriptor.opened) {
        await this._feedStore.openFeed(descriptor.key);
      }
    }
  }

  async close () {
    await this._feedStore.close();
  }

  // TODO(marik-d): Should probably not be here.
  getPartyKeys (): PartyKey[] {
    return Array.from(new Set(
      this._feedStore.getDescriptors()
        .map(descriptor => PublicKey.from(descriptor.metadata.partyKey))
        .filter(Boolean)
    ).values());
  }

  getFeed (feedKey: FeedKey): HypercoreFeed | null | undefined {
    const descriptor = this._feedStore.getDescriptors().find(descriptor => feedKey.equals(descriptor.key));
    return descriptor?.feed;
  }

  queryWritableFeed (partyKey: PartyKey): HypercoreFeed | null | undefined {
    // TODO(telackey): 'writable' is true property of the Feed, not just its Descriptor's metadata.
    // Using that real value would be preferable to using metadata, but I think it requires the Feed be open.
    const descriptor = this._feedStore.getDescriptors()
      .find(descriptor => partyKey.equals(descriptor.metadata.partyKey) && descriptor.metadata.writable);
    return descriptor?.feed;
  }

  async createWritableFeed (partyKey: PartyKey): Promise<HypercoreFeed> {
    // TODO(marik-d): Something is wrong here; Buffer should be a subclass of Uint8Array but it isn't here.
    assert(!this.queryWritableFeed(partyKey), 'Writable feed already exists');

    // TODO(telackey): 'writable' is true property of the Feed, not just its Descriptor's metadata.
    // Using that real value would be preferable to using metadata, but I think it requires the Feed be open.
    const { publicKey, secretKey } = createKeyPair();
    const key = PublicKey.from(publicKey);
    await this._keyring.addKeyRecord({
      type: KeyType.FEED,
      publicKey: key,
      secretKey
    });
    return this._feedStore.createReadWriteFeed({
      key,
      secretKey,
      metadata: { partyKey: partyKey.asBuffer(), writable: true }
    });
  }

  async createReadOnlyFeed (feedKey: FeedKey, partyKey: PartyKey): Promise<HypercoreFeed> {
    await this._keyring.addKeyRecord({
      type: KeyType.FEED,
      publicKey: feedKey
    });
    return this._feedStore.createReadOnlyFeed({
      key: feedKey,
      metadata: { partyKey: partyKey.asBuffer() }
    });
  }

  createIterator (
    partyKey: PartyKey,
    messageSelector: MessageSelector,
    initialTimeframe?: Timeframe
  ): Promise<FeedStoreIterator> {
    return createIterator(
      this._feedStore,
      descriptor => partyKey.equals(descriptor.metadata.partyKey),
      messageSelector,
      initialTimeframe
    );
  }
}
