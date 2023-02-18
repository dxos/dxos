//
// Copyright 2019 DXOS.org
//

import assert from 'node:assert';

import { Event, sleep } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { FeedFactory, FeedOptions } from './feed-factory';
import { FeedWrapper } from './feed-wrapper';

export interface FeedStoreOptions<T extends {}> {
  factory: FeedFactory<T>;
}

/**
 * Persistent hypercore store.
 */
export class FeedStore<T extends {}> {
  private readonly _feeds: ComplexMap<PublicKey, FeedWrapper<T>> = new ComplexMap(PublicKey.hash);
  private readonly _factory: FeedFactory<T>;

  private _closed = false;

  readonly feedOpened = new Event<FeedWrapper<T>>();

  constructor({ factory }: FeedStoreOptions<T>) {
    this._factory = factory ?? failUndefined();
  }

  get size() {
    return this._feeds.size;
  }

  get feeds() {
    return Array.from(this._feeds.values());
  }

  /**
   * Get the open feed if it exists.
   */
  getFeed(publicKey: PublicKey): FeedWrapper<T> | undefined {
    return this._feeds.get(publicKey);
  }

  /**
   * Gets or opens a feed.
   * The feed is readonly unless a secret key is provided.
   */
  async openFeed(feedKey: PublicKey, { writable }: FeedOptions = {}): Promise<FeedWrapper<T>> {
    log('opening feed', { feedKey });
    assert(feedKey);
    assert(!this._closed, 'Feed store is closed');

    let feed = this.getFeed(feedKey);
    if (feed) {
      // TODO(burdon): Need to check that there's another instance being used (create test and break this).
      // TODO(burdon): Remove from store if feed is closed externally? (remove wrapped open/close methods?)
      if (writable && !feed.properties.writable) {
        throw new Error(`Read-only feed is already open: ${feedKey.truncate()}`);
      } else {
        await feed.open();
        return feed;
      }
    }

    const core = this._factory.createFeed(feedKey, { writable });
    feed = new FeedWrapper<T>(core, feedKey);
    this._feeds.set(feed.key, feed);

    await feed.open();
    this.feedOpened.emit(feed);

    log('opened');
    return feed;
  }

  /**
   * Close all feeds.
   */
  async close() {
    log('closing...');
    this._closed = true;
    await Promise.all(
      Array.from(this._feeds.values()).map(async (feed) => {
        await feed.close();
        assert(feed.closed);
        // TODO(burdon): SpaceProxy still being initialized.
        //  SpaceProxy.initialize => Database.createItem => ... => FeedWrapper.append
        //  Uncaught Error: Closed [random-access-storage/index.js:181:38]
        await sleep(100);
      })
    );

    this._feeds.clear();
    log('closed');
  }
}
