//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { Feed } from 'hypercore';

import { createId } from '@dxos/crypto';
import { createIterator, FeedKey, FeedStoreIterator, MessageSelector, PartyKey } from '@dxos/experimental-echo-protocol';
import { FeedStore } from '@dxos/feed-store';

/**
 * An adapter class to better define the API surface of FeedStore we use.
 * Generally, all ECHO classes should use this intead of an actual FeedStore.
 */
// TODO(burdon): Temporary: will replace FeedStore.
export class FeedStoreAdapter {
  constructor (
    private readonly _feedStore: FeedStore
  ) {}

  // TODO(burdon): Remove.
  get feedStore () {
    return this._feedStore;
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
        .map(descriptor => descriptor.metadata.partyKey)
        .filter(Boolean)
    ).values());
  }

  getFeed (feedKey: FeedKey): Feed | undefined {
    const descriptor = this._feedStore.getDescriptors().find(descriptor => descriptor.key.equals(feedKey));
    return descriptor?.feed;
  }

  queryWritableFeed (partyKey: PartyKey): Feed | undefined {
    // TODO(telackey): 'writable' is true property of the Feed, not just its Descriptor's metadata.
    // Using that real value would be preferable to using metadata, but I think it requires the Feed be open.
    const descriptor = this._feedStore.getDescriptors()
      .find(descriptor => descriptor.metadata.partyKey.equals(partyKey) && descriptor.metadata.writable);
    return descriptor?.feed;
  }

  createWritableFeed (partyKey: PartyKey): Promise<Feed> {
    // TODO(marik-d): Something is wrong here; Buffer should be a subclass of Uint8Array but it isn't here.
    assert(partyKey instanceof Uint8Array || Buffer.isBuffer(partyKey));
    assert(!this.queryWritableFeed(partyKey), 'Writable feed already exists');

    // TODO(telackey): 'writable' is true property of the Feed, not just its Descriptor's metadata.
    // Using that real value would be preferable to using metadata, but I think it requires the Feed be open.
    return this._feedStore.openFeed(createId(), { metadata: { partyKey, writable: true } } as any);
  }

  createReadOnlyFeed (feedKey: FeedKey, partyKey: PartyKey): Promise<Feed> {
    assert(partyKey instanceof Uint8Array || Buffer.isBuffer(partyKey));
    return this._feedStore.openFeed(createId(), { key: Buffer.from(feedKey), metadata: { partyKey } } as any);
  }

  createIterator (partyKey: PartyKey, messageSelector: MessageSelector): Promise<FeedStoreIterator> {
    return createIterator(
      this._feedStore,
      descriptor => descriptor.metadata.partyKey.equals(partyKey),
      messageSelector
    );
  }
}
