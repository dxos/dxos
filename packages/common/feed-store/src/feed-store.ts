//
// Copyright 2019 DXOS.org
//

import { Hypercore } from 'hypercore';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { ComplexMap } from '@dxos/util';

import { FeedFactory, FeedOptions } from './feed-factory';
import { FeedWrapper } from './feed-wrapper';

export interface FeedStoreOptions {
  factory: FeedFactory
}

/**
 * Persistent hypercore store.
 */
export class FeedStore {
  private readonly _feeds: ComplexMap<PublicKey, FeedWrapper> = new ComplexMap(key => key.toHex());

  private readonly _factory: FeedFactory;

  // TODO(burdon): Use this pattern everywhere.
  readonly onOpen = new Event<Hypercore>();

  constructor ({
    factory
  }: FeedStoreOptions) {
    this._factory = factory;
  }

  get size () {
    return this._feeds.size;
  }

  /**
   * Get the an open feed if it exists.
   */
  getFeed (publicKey: PublicKey): FeedWrapper | undefined {
    return this._feeds.get(publicKey);
  }

  /**
   * Gets or opens a feed.
   * The feed is readonly unless a secret key is provided.
   */
  // TODO(burdon): Remove from store if feed is closed externally? (remove wrapped open/close methods?)
  async openFeed (publicKey: PublicKey, { writable }: FeedOptions = {}): Promise<FeedWrapper> {
    let feed = this.getFeed(publicKey);
    if (feed) {
      if (Boolean(feed.properties.writable) !== Boolean(writable)) {
        await feed.close();
      } else {
        await feed.open();
        return feed;
      }
    }

    const core = this._factory.createFeed(publicKey, {
      writable
    });

    feed = new FeedWrapper(core, publicKey);
    this._feeds.set(feed.key, feed);
    await feed.open();
    return feed;
  }

  async close () {
    await Promise.all(Array.from(this._feeds.values()).map(feed => feed.close()));
    this._feeds.clear();
  }
}
