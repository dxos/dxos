//
// Copyright 2021 DXOS.org
//

import assert from "assert";
import debug from "debug";

import { Event } from "@dxos/async";
import { Keyring, KeyType } from "@dxos/credentials";
import { PublicKey } from "@dxos/crypto";
import { FeedDescriptor, FeedStore } from "@dxos/feed-store";

import { MetadataStore } from "../metadata";
import { FeedStoreIterator, MessageSelector, Timeframe } from "@dxos/echo-protocol";

const STALL_TIMEOUT = 1000;
const warn = debug('dxos:echo:feed-store-iterator:warn');

export class PartyFeedProvider {
  constructor (
    private readonly _metadataStore: MetadataStore,
    private readonly _keyring: Keyring,
    private readonly _feedStore: FeedStore,
    private readonly _partyKey: PublicKey
  ) {}

  // TODO(dmaretskyi): Consider refactoring this to have write feed stored separeately in metadata.
  async getWritableFeed() {
    let feed: FeedDescriptor | undefined = undefined;

    for (const feedKey of this._metadataStore.getParty(this._partyKey)?.feedKeys ?? []) {
      const fullKey = this._keyring.getFullKey(feedKey);
      if (fullKey && fullKey.secretKey) {
        feed = await this._feedStore.openReadWriteFeed(fullKey.publicKey, fullKey.secretKey);
      }
    }
    if (feed) {
      const feedKey = this._keyring.getKey(feed.key);
      assert(feedKey, 'Feed key not found');
      return { feed, feedKey }
    }
    return this._createReadWriteFeed();
  }

  getFeedKeys() {
    return this._metadataStore.getParty(this._partyKey)?.feedKeys ?? [];
  }

  // async openReadWriteFeed (feedKey: PublicKey) {
  //   await this._metadataStore.addPartyFeed(this._partyKey, feedKey);
  //   const fullKey = this._keyring.getFullKey(feedKey);
  //   assert(fullKey && fullKey.secretKey);
  //   return this._feedStore.openReadWriteFeed(feedKey, fullKey.secretKey);
  // }

  async createOrOpenReadOnlyFeed (feedKey: PublicKey) {
    await this._metadataStore.addPartyFeed(this._partyKey, feedKey);
    if(!this._keyring.hasKey(feedKey)) {
      this._keyring.addKeyRecord({ type: KeyType.FEED, publicKey: feedKey });
    }
    return this._feedStore.openReadOnlyFeed(feedKey);
  }

  private async _createReadWriteFeed () {
    const feedKey = await this._keyring.createKeyRecord({ type: KeyType.FEED });
    const fullKey = this._keyring.getFullKey(feedKey.publicKey);
    assert(fullKey && fullKey.secretKey);
    await this._metadataStore.addPartyFeed(this._partyKey, fullKey.publicKey);
    const feed = await this._feedStore.openReadWriteFeed(fullKey.publicKey, fullKey.secretKey);
    return { feed, feedKey }; // TODO(vlad): Return only feed.
  }

  // async _createReadOnlyFeed () {
  //   const feedKey = await this._keyring.createKeyRecord({ type: KeyType.FEED });
  //   const fullKey = this._keyring.getFullKey(feedKey.publicKey);
  //   assert(fullKey);
  //   await this._metadataStore.addPartyFeed(this._partyKey, fullKey.publicKey);
  //   const feed = await this._feedStore.openReadOnlyFeed(fullKey.publicKey);
  //   return { feed, feedKey };
  // }

  async createIterator (messageSelector: MessageSelector, initialTimeframe?: Timeframe) {
    const iterator = new FeedStoreIterator(() => true, messageSelector, initialTimeframe ?? new Timeframe());
    for (const feedKey of this.getFeedKeys()) {
      iterator.addFeedDescriptor(await this.createOrOpenReadOnlyFeed(feedKey));
    }

    this._feedStore.feedOpenedEvent.on((descriptor) => {
      if (!!this._metadataStore.getParty(this._partyKey)?.feedKeys?.find(feedKey => feedKey.equals(descriptor.key))) {
        iterator.addFeedDescriptor(descriptor);
      }
    });

    iterator.stalled.on(candidates => {
      warn(`Feed store reader stalled: no message candidates were accepted after ${STALL_TIMEOUT}ms timeout.\nCurrent candidates:`, candidates);
    });

    return iterator;
  }
}
