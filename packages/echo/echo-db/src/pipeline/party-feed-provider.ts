//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Keyring, KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { FeedStoreIterator, MessageSelector, Timeframe } from '@dxos/echo-protocol';
import { FeedDescriptor, FeedStore } from '@dxos/feed-store';
import { ComplexMap } from '@dxos/util'

import { MetadataStore } from '../metadata';
import { Event } from '@dxos/async';

const STALL_TIMEOUT = 1000;
const warn = debug('dxos:echo-db:party-feed-provider:warn');

export class PartyFeedProvider {
  private readonly _descriptors = new ComplexMap<PublicKey, FeedDescriptor>(x => x.toHex())
  readonly feedOpened = new Event<FeedDescriptor>();
  
  constructor (
    private readonly _metadataStore: MetadataStore,
    private readonly _keyring: Keyring,
    private readonly _feedStore: FeedStore,
    private readonly _partyKey: PublicKey
  ) {}

  async createOrOpenWritableFeed () {
    const partyMetadata = this._metadataStore.getParty(this._partyKey);
    if (!partyMetadata?.dataFeedKey) {
      return this._createReadWriteFeed();
    }

    const fullKey = this._keyring.getFullKey(partyMetadata.dataFeedKey);
    if (!fullKey?.secretKey) {
      return this._createReadWriteFeed();
    }
    
    if(this._descriptors.has(fullKey.publicKey)) {
      return this._descriptors.get(fullKey.publicKey)!;
    }

    const feed = await this._feedStore.openReadWriteFeed(fullKey.publicKey, fullKey.secretKey);
    this._descriptors.set(fullKey.publicKey, feed);
    this.feedOpened.emit(feed);
    return feed;
  }

  getFeedKeys () {
    return this._metadataStore.getParty(this._partyKey)?.feedKeys ?? [];
  }

  async createOrOpenReadOnlyFeed (feedKey: PublicKey): Promise<FeedDescriptor> {
    if(this._descriptors.has(feedKey)) {
      return this._descriptors.get(feedKey)!;
    }

    await this._metadataStore.addPartyFeed(this._partyKey, feedKey);
    if (!this._keyring.hasKey(feedKey)) {
      await this._keyring.addPublicKey({ type: KeyType.FEED, publicKey: feedKey });
    }
    const feed = await this._feedStore.openReadOnlyFeed(feedKey);
    this._descriptors.set(feedKey, feed);
    this.feedOpened.emit(feed);
    return feed;
  }

  private async _createReadWriteFeed () {
    const feedKey = await this._keyring.createKeyRecord({ type: KeyType.FEED });
    const fullKey = this._keyring.getFullKey(feedKey.publicKey);
    assert(fullKey && fullKey.secretKey);
    await this._metadataStore.setDataFeed(this._partyKey, fullKey.publicKey);
    const feed = await this._feedStore.openReadWriteFeed(fullKey.publicKey, fullKey.secretKey);
    this._descriptors.set(fullKey.publicKey, feed);
    this.feedOpened.emit(feed);
    return feed;
  }

  async createIterator (messageSelector: MessageSelector, initialTimeframe?: Timeframe) {
    const iterator = new FeedStoreIterator(() => true, messageSelector, initialTimeframe ?? new Timeframe());
    for (const feedKey of this.getFeedKeys()) {
      iterator.addFeedDescriptor(await this.createOrOpenReadOnlyFeed(feedKey));
    }

    this.feedOpened.on((descriptor) => {
      if (this._metadataStore.getParty(this._partyKey)?.feedKeys?.find(feedKey => feedKey.equals(descriptor.key))) {
        iterator.addFeedDescriptor(descriptor);
      }
    });

    iterator.stalled.on(candidates => {
      warn(`Feed store reader stalled: no message candidates were accepted after ${STALL_TIMEOUT}ms timeout.\nCurrent candidates:`, candidates);
    });

    return iterator;
  }
}
