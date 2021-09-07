//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import jsonBuffer from 'buffer-json-encoding';
import hypertrie from 'hypertrie';

import { Keyring, KeyType } from '@dxos/credentials';
import { PublicKey, createKeyPair } from '@dxos/crypto';
import {
  codec, createIterator, FeedKey, FeedStoreIterator, MessageSelector, PartyKey, Timeframe
} from '@dxos/echo-protocol';
import { CreateReadOnlyFeedOptions, FeedDescriptor, FeedStore, HypercoreFeed } from '@dxos/feed-store';
import { IStorage } from '@dxos/random-access-multi-storage';

import { IndexDB } from './index-db';

// TODO(burdon): Change to "dxos.feedstore"?
export const STORE_NAMESPACE = '@feedstore';

export type Hypertrie = (...args: any) => ReturnType<typeof hypertrie>;

export interface FeedStoreAdapterOptions {
  /**
   * Defines a custom hypertrie database to index the feeds.
   */
  database?: Hypertrie,
}

export interface CreateFeedOptions extends CreateReadOnlyFeedOptions {
  secretKey?: Buffer
}

/**
 * An adapter class to better define the API surface of FeedStore we use.
 * Generally, all ECHO classes should use this intead of an actual FeedStore.
 */
// TODO(burdon): Temporary: will replace FeedStore.
export class FeedStoreAdapter {
  static create (storage: IStorage, keyring: Keyring, options: FeedStoreAdapterOptions = {}) {
    const feedStore = new FeedStore(storage, { valueEncoding: codec });
    return new FeedStoreAdapter(feedStore, keyring, storage, options);
  }

  private _indexDB: IndexDB | null;
  private readonly _database: Hypertrie;

  constructor (
    private readonly _feedStore: FeedStore,
    private readonly _keyring: Keyring,
    private readonly _storage: IStorage,
    options: FeedStoreAdapterOptions = {}
  ) {
    const {
      database = (...args: any) => hypertrie(...args)
    } = options;
    this._database = database;
    this._indexDB = null;
  }

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

    this._indexDB = new IndexDB(this._database(this._storage.createOrOpen.bind(this._storage), { valueEncoding: jsonBuffer }));
    const list = await this._indexDB.list(STORE_NAMESPACE);

    for (const data of list) {
      const key = PublicKey.from(data.key); // cause we don't have PublicKey deserialization
      const secretKey = this._keyring.getFullKey(key)?.secretKey;
      await this._createFeed({ ...data, secretKey, key });
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
    await this._indexDB?.close();
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
    return this._createFeed({
      key,
      secretKey
    });
  }

  async createReadOnlyFeed (feedKey: FeedKey, partyKey: PartyKey): Promise<HypercoreFeed> {
    return this._createFeed({
      key: feedKey
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

  private async _createFeed (options: CreateFeedOptions) {
    const feed = options.secretKey ? await this.feedStore.createReadWriteFeed({ ...options, secretKey: options.secretKey }) : await this.feedStore.createReadOnlyFeed(options);
    const descriptor = this.feedStore.getDescriptor(feed.key);
    assert(descriptor, 'Couldn\'t create descriptor');
    this._setDescriptorEvents(descriptor);
    await this._persistDescriptor(descriptor);
    return feed;
  }

  private _setDescriptorEvents (descriptor: FeedDescriptor) {
    descriptor.watch(async (event) => {
      if (event === 'updated') {
        await this._persistDescriptor(descriptor);
        return;
      }

      const { feed } = descriptor;

      if (event === 'opened' && feed) {
        await this._persistDescriptor(descriptor);
      }
    });
  }

  private async _persistDescriptor (descriptor: FeedDescriptor) {
    assert(this._indexDB, 'IndexDB is null');
    const key = `${STORE_NAMESPACE}/${descriptor.key.toString()}`;

    const oldData = await this._indexDB.get(key);

    const newData = {
      key: descriptor.key.asBuffer(),
      valueEncoding: typeof descriptor.valueEncoding === 'string' ? descriptor.valueEncoding : undefined,
      metadata: descriptor.metadata
    };

    if (!oldData || JSON.stringify(oldData.metadata) !== JSON.stringify(newData.metadata)) {
      await this._indexDB.put(key, newData);
    }
  }
}
