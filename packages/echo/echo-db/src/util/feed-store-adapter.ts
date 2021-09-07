//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import jsonBuffer from 'buffer-json-encoding';
import hypertrie from 'hypertrie';

import { Keyring, KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import {
  codec, createIterator, FeedKey, FeedStoreIterator, MessageSelector, PartyKey, Timeframe
} from '@dxos/echo-protocol';
import { CreateReadOnlyFeedOptions, FeedDescriptor, FeedStore, HypercoreFeed } from '@dxos/feed-store';
import { IStorage } from '@dxos/random-access-multi-storage';

import { Metadata } from '../metadata';

export interface CreateFeedOptions extends CreateReadOnlyFeedOptions {
  secretKey?: Buffer
}

/**
 * An adapter class to better define the API surface of FeedStore we use.
 * Generally, all ECHO classes should use this intead of an actual FeedStore.
 */
// TODO(burdon): Temporary: will replace FeedStore.
export class FeedStoreAdapter {
  static create (storage: IStorage, keyring: Keyring, metadata: Metadata) {
    const feedStore = new FeedStore(storage, { valueEncoding: codec });
    return new FeedStoreAdapter(feedStore, keyring, metadata);
  }

  constructor (
    private readonly _feedStore: FeedStore,
    private readonly _keyring: Keyring,
    private readonly _metadata: Metadata
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
    for (const party of this._metadata.parties) {
      for (const feedKey of party.feedKeys ?? []) {
        const secretKey = this._keyring.getFullKey(feedKey)?.secretKey;
        await this._createFeed({ key: feedKey, secretKey });
      }
    }
  }

  async close () {
    await this._feedStore.close();
    await this._indexDB?.close();
  }

  // TODO(marik-d): Should probably not be here.
  getPartyKeys (): PartyKey[] {
    return Array.from(new Set(
      this._metadata.parties.map(party => party.key)
    )).values());
  }

  getFeed (feedKey: FeedKey): HypercoreFeed | null | undefined {
    const descriptor = this._feedStore.getDescriptors().find(descriptor => feedKey.equals(descriptor.key));
    return descriptor?.feed;
  }

  queryWritableFeed (partyKey: PartyKey): HypercoreFeed | null | undefined {
    // TODO(telackey): 'writable' is true property of the Feed, not just its Descriptor's metadata.
    // Using that real value would be preferable to using metadata, but I think it requires the Feed be open.
    const feedKeys = this._metadata.parties.find(party => party.key && partyKey.equals(party.key))?.feedKeys ?? [];
    return this._feedStore.getDescriptors().find(descriptor =>  descriptor.writable && feedKeys.find(feedKey => descriptor.key.equals(feedKey)))?.feed;
  }

  /**
   * Create and open feed if feed with given key doesm't exist and open existing feed otherwsie.
   */
  async createWritableFeed (partyKey: PartyKey): Promise<HypercoreFeed> {
    // TODO(marik-d): Something is wrong here; Buffer should be a subclass of Uint8Array but it isn't here.
    // assert(!this.queryWritableFeed(partyKey), 'Writable feed already exists');

    // TODO(telackey): 'writable' is true property of the Feed, not just its Descriptor's metadata.
    // Using that real value would be preferable to using metadata, but I think it requires the Feed be open.
    const keyRecord = await this._keyring.createKeyRecord({ type: KeyType.FEED });
    const fullKeyRecord = this._keyring.getFullKey(keyRecord.publicKey);
    assert(fullKeyRecord && fullKeyRecord.secretKey);
    return this._createFeed({
      key: fullKeyRecord.publicKey,
      secretKey: fullKeyRecord.secretKey,
    });
  }

  /**
   * Create and open feed if feed with given key doesm't exist and open existing feed otherwsie.
   */
  async createReadOnlyFeed (feedKey: FeedKey, partyKey: PartyKey): Promise<HypercoreFeed> {
    return this._createFeed({
      key: feedKey,
    });
  }

  createIterator (
    partyKey: PartyKey,
    messageSelector: MessageSelector,
    initialTimeframe?: Timeframe
  ): Promise<FeedStoreIterator> {
    return createIterator(
      this._feedStore,
      descriptor => !!this._metadata.parties.find(party => party.key && partyKey.equals(party.key))?.feedKeys?.find(feedKey => descriptor.key.equals(feedKey)),
      messageSelector,
      initialTimeframe
    );
  }

  private async _createFeed (options: CreateFeedOptions) {
    return options.secretKey ? await this.feedStore.createReadWriteFeed({ ...options, secretKey: options.secretKey }) : await this.feedStore.createReadOnlyFeed(options);
  }
}
