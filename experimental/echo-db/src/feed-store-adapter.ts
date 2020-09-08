//
// Copyright 2020 DXOS.org
//

import { FeedStore } from '@dxos/feed-store';
import { FeedKey, PartyKey } from '@dxos/experimental-echo-protocol';
import { keyToString } from '@dxos/crypto';
import { Feed } from 'hypercore';

export class FeedStoreAdapter {
  constructor (
    private readonly _feedStore: FeedStore
  ) { }

  get feedStore () {
    return this._feedStore;
  }

  async open () {
    await this._feedStore.open();
  }

  async close () {
    await this._feedStore.close();
  }

  openFeed (feedKey: FeedKey, partyKey: PartyKey): Promise<Feed> {
    return this._feedStore.openFeed(keyToString(feedKey), { metadata: { partyKey } } as any);
  }

  getFeed (feedKey: FeedKey): Feed | undefined {
    const descriptor = this._feedStore.getDescriptors().find(descriptor => descriptor.path === keyToString(feedKey));
    return descriptor?.feed;
  }

  // TODO(marik-d): Should probably not be here
  enumerateParties (): PartyKey[] {
    return Array.from(new Set(
      this._feedStore.getDescriptors()
        .map(descriptor => descriptor.metadata.partyKey)
        .filter(Boolean)
    ).values());
  }
}
