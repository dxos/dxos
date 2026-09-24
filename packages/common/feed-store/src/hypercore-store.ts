//
// Copyright 2019 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Event, Mutex } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexMap, defaultMap } from '@dxos/util';

import { type HypercoreCreateOptions, type HypercoreFactory, HypercoreFactoryService } from './hypercore-factory.ts';
import { type HypercoreWrapper } from './hypercore-wrapper.ts';

export interface HypercoreStoreOptions<T extends {}> {
  factory: HypercoreFactory<T>;
}

/**
 * Effect service tag for {@link HypercoreStore}.
 */
export class HypercoreStoreService extends EffectContext.Service<HypercoreStoreService, HypercoreStore<any>>()(
  '@dxos/feed-store/HypercoreStore',
) {}

/**
 * Persistent hypercore store.
 */
export class HypercoreStore<T extends {}> {
  private readonly _feeds: ComplexMap<PublicKey, HypercoreWrapper<T>> = new ComplexMap(PublicKey.hash);
  private readonly _mutexes = new ComplexMap<PublicKey, Mutex>(PublicKey.hash);
  private readonly _factory: HypercoreFactory<T>;

  private _closed = false;

  readonly feedOpened = new Event<HypercoreWrapper<T>>();

  constructor({ factory }: HypercoreStoreOptions<T>) {
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
  getHypercore(publicKey: PublicKey): HypercoreWrapper<T> | undefined {
    return this._feeds.get(publicKey);
  }

  /**
   * Gets or opens a feed.
   * The feed is readonly unless a secret key is provided.
   */
  async openHypercore(
    feedKey: PublicKey,
    { writable, sparse }: HypercoreCreateOptions = {},
  ): Promise<HypercoreWrapper<T>> {
    log('opening feed', { feedKey });
    invariant(feedKey);
    invariant(!this._closed, 'Feed store is closed');

    const mutex = defaultMap(this._mutexes, feedKey, () => new Mutex());

    return mutex.executeSynchronized(async () => {
      let feed = this.getHypercore(feedKey);
      if (feed) {
        // TODO(burdon): Need to check that there's another instance being used (create test and break this).
        // TODO(burdon): Remove from store if feed is closed externally? (remove wrapped open/close methods?)
        if (writable && !feed.properties.writable) {
          throw new Error(`Read-only feed is already open: ${feedKey.truncate()}`);
        } else if ((sparse ?? false) !== feed.properties.sparse) {
          throw new Error(
            `Feed already open with different sparse setting: ${feedKey.truncate()} [${sparse} !== ${
              feed.properties.sparse
            }]`,
          );
        } else {
          await feed.open();
          return feed;
        }
      }

      feed = await this._factory.createHypercore(feedKey, { writable, sparse });
      this._feeds.set(feed.key, feed);

      await feed.open();
      this.feedOpened.emit(feed);
      log('opened', { feedKey });
      return feed;
    });
  }

  /**
   * Close all feeds.
   */
  async close(): Promise<void> {
    log('closing...');
    this._closed = true;
    await Promise.all(
      Array.from(this._feeds.values()).map(async (feed) => {
        await feed.close();
        invariant(feed.closed);
        // TODO(burdon): SpaceProxy still being initialized.
        //  SpaceProxy.initialize => Database.createItem => ... => HypercoreWrapper.append
        //  Uncaught Error: Closed [random-access-storage/index.js:181:38]
        // await sleep(100);
      }),
    );

    this._feeds.clear();
    log('closed');
  }
}

/**
 * Effect Layer constructing a {@link HypercoreStore} from a {@link HypercoreFactory} service.
 */
export const HypercoreStoreLayer = (): Layer.Layer<HypercoreStoreService, never, HypercoreFactoryService> =>
  Layer.effect(
    HypercoreStoreService,
    Effect.gen(function* () {
      const factory = yield* HypercoreFactoryService;
      const store = new HypercoreStore({ factory });
      yield* Effect.addFinalizer(() => Effect.promise(() => store.close()));
      return store;
    }),
  );
