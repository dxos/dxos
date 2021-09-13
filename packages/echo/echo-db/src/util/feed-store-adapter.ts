//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Keyring, KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import {
  codec, createIterator, FeedKey, FeedSelector, FeedStoreIterator, MessageSelector, PartyKey, Timeframe
} from '@dxos/echo-protocol';
import { CreateReadOnlyFeedOptions, FeedStore, HypercoreFeed } from '@dxos/feed-store';
import { IStorage } from '@dxos/random-access-multi-storage';
import { boolGuard } from '@dxos/util';

import { MetadataStore } from '../metadata';

export interface CreateFeedOptions extends CreateReadOnlyFeedOptions {
  secretKey?: Buffer,
  partyKey: PublicKey
}

/**
 * An adapter class to better define the API surface of FeedStore we use.
 * Generally, all ECHO classes should use this intead of an actual FeedStore.
 */
// TODO(burdon): Temporary: will replace FeedStore.
export class FeedStoreAdapter {
  static create (storage: IStorage, keyring: Keyring, metadataStore: MetadataStore) {
    const feedStore = new FeedStore(storage, { valueEncoding: codec });
    return new FeedStoreAdapter(feedStore, keyring, metadataStore);
  }

  constructor (
    private readonly _feedStore: FeedStore,
    private readonly _keyring: Keyring,
    private readonly _metadataStore: MetadataStore
  ) { }

  // TODO(burdon): Remove.
  get feedStore () {
    return this._feedStore;
  }

  get storage () {
    return this._feedStore.storage;
  }

  async open () {
    if (!this._feedStore.opened) {
      await this._feedStore.open();
    }
    for (const party of this._metadataStore.parties) {
      for (const feedKey of party.feedKeys ?? []) {
        const secretKey = this._keyring.getFullKey(feedKey)?.secretKey;
        assert(party.key);
        // Open feed so its added to the descriptor map in the feed store, so later-on feed-store iterator can find it.
        await this._createFeed({ key: feedKey, secretKey, partyKey: party.key });
      }
    }
  }

  async close () {
    await this._feedStore.close();
  }

  // TODO(marik-d): Should probably not be here.
  getPartyKeys (): PartyKey[] {
    return Array.from(new Set(
      this._metadataStore.parties.map(party => party.key).filter(boolGuard)
    ).values());
  }

  getFeed (feedKey: FeedKey): HypercoreFeed | null | undefined {
    const descriptor = this._feedStore.getDescriptors().find(descriptor => feedKey.equals(descriptor.key));
    return descriptor?.feed;
  }

  queryWritableFeed (partyKey: PartyKey): HypercoreFeed | null | undefined {
    // TODO(telackey): 'writable' is true property of the Feed, not just its Descriptor's metadata.
    // Using that real value would be preferable to using metadata, but I think it requires the Feed be open.
    const feedKeys = this._metadataStore.parties.find(party => party.key && partyKey.equals(party.key))?.feedKeys ?? [];
    return this._feedStore.getDescriptors().find(descriptor => descriptor.writable && feedKeys.find(feedKey => descriptor.key.equals(feedKey)))?.feed;
  }

  /**
   * Create and open feed if feed with given key doesm't exist and open existing feed otherwsie.
   */
  async createWritableFeed (partyKey: PartyKey): Promise<HypercoreFeed> {
    // TODO(telackey): 'writable' is true property of the Feed, not just its Descriptor's metadata.
    // Using that real value would be preferable to using metadata, but I think it requires the Feed be open.
    const keyRecord = await this._keyring.createKeyRecord({ type: KeyType.FEED });
    const fullKeyRecord = this._keyring.getFullKey(keyRecord.publicKey);
    assert(fullKeyRecord && fullKeyRecord.secretKey);
    return this._createFeed({
      key: fullKeyRecord.publicKey,
      secretKey: fullKeyRecord.secretKey,
      partyKey
    });
  }

  /**
   * Create and open feed if feed with given key doesm't exist and open existing feed otherwsie.
   */
  async createReadOnlyFeed (feedKey: FeedKey, partyKey: PartyKey): Promise<HypercoreFeed> {
    return this._createFeed({
      key: feedKey,
      partyKey
    });
  }

  /**
   * Determines which feeds belong to the given party.
   */
  createFeedSelector (partyKey: PartyKey): FeedSelector {
    return descriptor => !!this._metadataStore.getParty(partyKey)?.feedKeys?.find(feedKey => descriptor.key.equals(feedKey));
  }

  createIterator (
    partyKey: PartyKey,
    messageSelector: MessageSelector,
    initialTimeframe?: Timeframe
  ): Promise<FeedStoreIterator> {
    return createIterator(
      this._feedStore,
      this.createFeedSelector(partyKey),
      messageSelector,
      initialTimeframe
    );
  }

  private async _createFeed (options: CreateFeedOptions) {
    await this._metadataStore.addPartyFeed(options.partyKey, options.key);
    return options.secretKey ? await this.feedStore.createReadWriteFeed({ ...options, secretKey: options.secretKey }) : await this.feedStore.createReadOnlyFeed(options);
  }
}
