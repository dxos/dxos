//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import type { Feed } from 'hypercore';

import { patchBufferCodec } from '@dxos/codec-protobuf';
import { createId, PublicKey } from '@dxos/crypto';
import {
  codec, createIterator, FeedKey, FeedStoreIterator, MessageSelector, PartyKey, Timeframe
} from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { IStorage } from '@dxos/random-access-multi-storage';

/**
 * An adapter class to better define the API surface of FeedStore we use.
 * Generally, all ECHO classes should use this intead of an actual FeedStore.
 */
// TODO(burdon): Temporary: will replace FeedStore.
export class FeedStoreAdapter {
  static create (storage: IStorage) {
    return new FeedStoreAdapter(new FeedStore(storage, { feedOptions: { valueEncoding: patchBufferCodec(codec) } }));
  }

  constructor (
    private readonly _feedStore: FeedStore
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
      await this._feedStore.open();
    }

    // TODO(telackey): There may be a better way to do this, but at the moment,
    // we don't have any feeds we don't need to be open.
    for await (const descriptor of this._feedStore.getDescriptors()) {
      if (!descriptor.opened) {
        await this._feedStore.openFeed(descriptor.path, descriptor.metadata);
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

  getFeed (feedKey: FeedKey): Feed | undefined {
    const descriptor = this._feedStore.getDescriptors().find(descriptor => feedKey.equals(descriptor.key));
    return descriptor?.feed;
  }

  queryWritableFeed (partyKey: PartyKey): Feed | undefined {
    // TODO(telackey): 'writable' is true property of the Feed, not just its Descriptor's metadata.
    // Using that real value would be preferable to using metadata, but I think it requires the Feed be open.
    const descriptor = this._feedStore.getDescriptors()
      .find(descriptor => partyKey.equals(descriptor.metadata.partyKey) && descriptor.metadata.writable);
    return descriptor?.feed;
  }

  createWritableFeed (partyKey: PartyKey): Promise<Feed> {
    // TODO(marik-d): Something is wrong here; Buffer should be a subclass of Uint8Array but it isn't here.
    assert(!this.queryWritableFeed(partyKey), 'Writable feed already exists');

    // TODO(telackey): 'writable' is true property of the Feed, not just its Descriptor's metadata.
    // Using that real value would be preferable to using metadata, but I think it requires the Feed be open.
    return this._feedStore.openFeed(createId(), { metadata: { partyKey: partyKey.asBuffer(), writable: true } } as any);
  }

  createReadOnlyFeed (feedKey: FeedKey, partyKey: PartyKey): Promise<Feed> {
    return this._feedStore.openFeed(createId(), { key: feedKey.asBuffer(), metadata: { partyKey: partyKey.asBuffer() } } as any);
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
