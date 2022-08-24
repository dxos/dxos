//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import { Keyring, KeyType } from '@dxos/credentials';
import { FeedSelector, FeedStoreIterator, MessageSelector } from '@dxos/echo-protocol';
import { FeedDescriptor, FeedStore } from '@dxos/feed-store';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { ComplexMap } from '@dxos/util';

import { MetadataStore } from './metadata-store';

const STALL_TIMEOUT = 1000;
const log = debug('dxos:echo-db:party-feed-provider');
const warn = debug('dxos:echo-db:party-feed-provider:warn');

export class PartyFeedProvider {
  private readonly _feeds = new ComplexMap<PublicKey, FeedDescriptor>(x => x.toHex());
  readonly feedOpened = new Event<FeedDescriptor>();

  constructor (
    private readonly _metadataStore: MetadataStore,
    private readonly _keyring: Keyring,
    private readonly _feedStore: FeedStore,
    private readonly _partyKey: PublicKey
  ) {}

  getFeeds (): FeedDescriptor[] {
    return Array.from(this._feeds.values());
  }

  @synchronized
  async createOrOpenWritableFeed () {
    const partyMetadata = this._metadataStore.getParty(this._partyKey);
    if (!partyMetadata?.dataFeedKey) {
      return this._createReadWriteFeed();
    }

    const fullKey = this._keyring.getFullKey(partyMetadata.dataFeedKey);
    if (!fullKey?.secretKey) {
      return this._createReadWriteFeed();
    }

    if (this._feeds.has(fullKey.publicKey)) {
      return this._feeds.get(fullKey.publicKey)!;
    }

    const feed = await this._feedStore.openReadWriteFeed(fullKey.publicKey, fullKey.secretKey);
    this._trackFeed(feed);
    return feed;
  }

  @synchronized
  async createOrOpenReadOnlyFeed (feedKey: PublicKey): Promise<FeedDescriptor> {
    if (this._feeds.has(feedKey)) {
      return this._feeds.get(feedKey)!;
    }

    if (!this._keyring.hasKey(feedKey)) {
      await this._keyring.addPublicKey({ type: KeyType.FEED, publicKey: feedKey });
    }
    const feed = await this._feedStore.openReadOnlyFeed(feedKey);
    this._trackFeed(feed);
    return feed;
  }

  private _trackFeed (feed: FeedDescriptor) {
    assert(!this._feeds.has(feed.key));
    this._feeds.set(feed.key, feed);
    this.feedOpened.emit(feed);

    log(`Party feed set changed: ${JSON.stringify({
      party: this._partyKey,
      feeds: Array.from(this._feeds.values()).map(feed => feed.key)
    })}`);
  }

  private async _createReadWriteFeed () {
    const feedKey = await this._keyring.createKeyRecord({ type: KeyType.FEED });
    const fullKey = this._keyring.getFullKey(feedKey.publicKey);
    assert(fullKey && fullKey.secretKey);
    await this._metadataStore.setDataFeed(this._partyKey, fullKey.publicKey);
    const feed = await this._feedStore.openReadWriteFeed(fullKey.publicKey, fullKey.secretKey);
    this._trackFeed(feed);
    return feed;
  }

  async createIterator (messageSelector: MessageSelector, feedSelector: FeedSelector, initialTimeframe?: Timeframe) {
    const iterator = new FeedStoreIterator(feedSelector, messageSelector, initialTimeframe ?? new Timeframe());
    for (const feed of this._feeds.values()) {
      iterator.addFeedDescriptor(feed);
    }

    this.feedOpened.on((descriptor) => {
      iterator.addFeedDescriptor(descriptor);
    });

    iterator.stalled.on(candidates => {
      warn(`Feed store reader stalled: no message candidates were accepted after ${STALL_TIMEOUT}ms timeout.\nCurrent candidates:`, candidates);
    });

    return iterator;
  }
}
