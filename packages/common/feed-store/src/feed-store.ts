//
// Copyright 2019 DXOS.org
//

import { Hypercore } from 'hypercore';

import { Event } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
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
export class FeedStore<T = {}> {
  private readonly _feeds: ComplexMap<PublicKey, FeedWrapper<T>> = new ComplexMap(PublicKey.hash);

  private readonly _factory: FeedFactory;

  // TODO(burdon): Use this pattern everywhere.
  readonly onOpen = new Event<Hypercore>();

  constructor ({
    factory
  }: FeedStoreOptions) {
    this._factory = factory ?? failUndefined();
  }

  get size () {
    return this._feeds.size;
  }

  /**
   * Get the an open feed if it exists.
   */
  getFeed (publicKey: PublicKey): FeedWrapper<T> | undefined {
    return this._feeds.get(publicKey);
  }

  /**
   * Gets or opens a feed.
   * The feed is readonly unless a secret key is provided.
   */
  async openFeed (publicKey: PublicKey, { writable }: FeedOptions = {}): Promise<FeedWrapper<T>> {
    let feed = this.getFeed(publicKey);
    if (feed) {
      // TODO(burdon): Need to check that there's another instance being used (create test and break this).
      // TODO(burdon): Remove from store if feed is closed externally? (remove wrapped open/close methods?)
      if (Boolean(feed.properties.writable) !== Boolean(writable)) {
        throw new Error(`Readonly feed is already open: ${feed.key.toHex()}`);
      } else {
        await feed.open();
        return feed;
      }
    }

    const core = this._factory.createFeed(publicKey, {
      writable
    });

    feed = new FeedWrapper<T>(core, publicKey);
    this._feeds.set(feed.key, feed);
    await feed.open();
    return feed;
  }

  /**
   * Close all feeds.
   */
  async clear () {
    await Promise.all(Array.from(this._feeds.values()).map(feed => feed.close()));
    this._feeds.clear();
  }
}
