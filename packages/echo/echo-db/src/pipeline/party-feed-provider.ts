//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Keyring, KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { FeedStoreIterator, MessageSelector, Timeframe } from '@dxos/echo-protocol';
import { FeedDescriptor, FeedStore } from '@dxos/feed-store';

import { MetadataStore } from '../metadata';
import { Unsubscribe } from '@dxos/util';

const STALL_TIMEOUT = 1000;
const warn = debug('dxos:echo-db:party-feed-provider:warn');

export class PartyFeedProvider {
  constructor (
    private readonly _metadataStore: MetadataStore,
    private readonly _keyring: Keyring,
    private readonly _feedStore: FeedStore,
    private readonly _partyKey: PublicKey
  ) {}

  getFeedKeys () {
    return this._metadataStore.getParty(this._partyKey)?.feedKeys ?? [];
  }

  onFeedOpened(cb: (feed: FeedDescriptor) => void): Unsubscribe {
    return this._feedStore.feedOpenedEvent.on((descriptor) => {
      if (this._metadataStore.getParty(this._partyKey)?.feedKeys?.find(feedKey => feedKey.equals(descriptor.key))) {
        cb(descriptor)
      }
    });
  }

  async createOrOpenDataFeed () {
    const partyMetadata = this._metadataStore.getParty(this._partyKey);

    const feed = partyMetadata?.dataFeedKey &&
      await this._tryOpenWritableFeed(partyMetadata.dataFeedKey);
    if(feed) {
      return feed;
    } 

    const newFeed = await this._createReadWriteFeed();
    await this._metadataStore.setDataFeed(this._partyKey, newFeed.key);
    return newFeed;
  }

  async createOrOpenReadOnlyFeed (feedKey: PublicKey): Promise<FeedDescriptor> {
    await this._metadataStore.addPartyFeed(this._partyKey, feedKey);
    if (!this._keyring.hasKey(feedKey)) {
      await this._keyring.addPublicKey({ type: KeyType.FEED, publicKey: feedKey });
    }
    return this._feedStore.openReadOnlyFeed(feedKey);
  }

  private async _tryOpenWritableFeed(key: PublicKey): Promise<FeedDescriptor | undefined> {
    const fullKey = this._keyring.getFullKey(key);
    if (!fullKey?.secretKey) {
      return undefined;
    }

    const feed = await this._feedStore.openReadWriteFeed(fullKey.publicKey, fullKey.secretKey);
    return feed;
  }

  private async _createReadWriteFeed () {
    const feedKey = await this._keyring.createKeyRecord({ type: KeyType.FEED });
    const fullKey = this._keyring.getFullKey(feedKey.publicKey);
    assert(fullKey && fullKey.secretKey);
    await this._metadataStore.setDataFeed(this._partyKey, fullKey.publicKey);
    const feed = await this._feedStore.openReadWriteFeed(fullKey.publicKey, fullKey.secretKey);
    return feed;
  }

  async createIterator (messageSelector: MessageSelector, initialTimeframe?: Timeframe) {
    const iterator = new FeedStoreIterator(() => true, messageSelector, initialTimeframe ?? new Timeframe());
    for (const feedKey of this.getFeedKeys()) {
      iterator.addFeedDescriptor(await this.createOrOpenReadOnlyFeed(feedKey));
    }

    this.onFeedOpened(descriptor => iterator.addFeedDescriptor(descriptor));

    iterator.stalled.on(candidates => {
      warn(`Feed store reader stalled: no message candidates were accepted after ${STALL_TIMEOUT}ms timeout.\nCurrent candidates:`, candidates);
    });

    return iterator;
  }
}
