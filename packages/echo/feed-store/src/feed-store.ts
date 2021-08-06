//
// Copyright 2019 DXOS.org
//

import assert from 'assert';
import jsonBuffer from 'buffer-json-encoding';
import { EventEmitter } from 'events';
import defaultHypercore from 'hypercore';
import hypertrie from 'hypertrie';

import { synchronized } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { IStorage } from '@dxos/random-access-multi-storage';

import FeedDescriptor from './feed-descriptor';
import type { Feed, Hypercore } from './hypercore-types';
import IndexDB from './index-db';
import Reader from './reader';

// TODO(burdon): Change to "dxos.feedstore"?
const STORE_NAMESPACE = '@feedstore';

type DescriptorCallback = (descriptor: FeedDescriptor) => boolean;
type StreamCallback = (descriptor: FeedDescriptor) => Object | undefined;

interface CreateDescriptorOptions {
  key: PublicKey,
  secretKey?: Buffer,
  valueEncoding?: string,
  metadata?: any
}

interface CreateReadWriteFeedOptions {
  key: PublicKey,
  secretKey: Buffer
  valueEncoding?: string,
  metadata?: any
}

interface CreateReadOnlyFeedOptions {
  key: PublicKey
  valueEncoding?: string,
  metadata?: any
}

/**
 * FeedStore
 *
 * Management of multiple feeds to create, update, load, find and delete feeds
 * into a persist repository storage.
 */
export class FeedStore extends EventEmitter {
  private _storage: IStorage;
  private _database: any;
  private _defaultFeedOptions: any;
  private _codecs: any;
  private _hypercore: Hypercore;
  private _descriptors: Map<string, FeedDescriptor>;
  private _readers: Set<Reader>;
  private _indexDB: any;
  private _open: boolean;

  /**
   * @param storage RandomAccessStorage to use by default by the feeds.
   * @param options.database Defines a custom hypertrie database to index the feeds.
   * @param options.feedOptions Default options for each feed.
   * @param options.codecs Defines a list of available codecs to work with the feeds.
   * @param options.hypercore Hypercore class to use.
   */
  constructor (storage: IStorage, options: any = {}) {
    assert(storage, 'The storage is required.');

    super();

    this._storage = storage;

    const {
      database = (...args: any) => hypertrie(...args),
      feedOptions = {},
      codecs = {},
      hypercore = defaultHypercore
    } = options;

    this._database = database;

    this._defaultFeedOptions = feedOptions;

    this._codecs = codecs;

    this._hypercore = hypercore;

    this._descriptors = new Map();

    this._readers = new Set();

    this._indexDB = null;

    this._open = false;

    this.on('feed', (_, descriptor) => {
      this._readers.forEach(reader => {
        reader.addFeedStream(descriptor).catch(err => {
          reader.destroy(err);
        });
      });
    });
  }

  get opened () {
    return this._open;
  }

  get closed () {
    return !this._open;
  }

  /**
   * @type {RandomAccessStorage}
   */
  get storage () {
    return this._storage;
  }

  @synchronized
  async open () {
    if (this._open) {
      return;
    }
    this._open = true;

    this._indexDB = new IndexDB(this._database(this._storage.createOrOpen.bind(this._storage), { valueEncoding: jsonBuffer }));

    const list = await this._indexDB.list(STORE_NAMESPACE);

    list.forEach((data: any) => {
      this._createDescriptor({ ...data, key: PublicKey.from(new Uint8Array(Object.values(data.key._value))) }); // cause we don't have PublicKey deserialization
    });

    this.emit('opened');

    // backward compatibility
    this.emit('ready');
  }

  @synchronized
  async close () {
    if (!this._open) {
      return;
    }
    this._open = false;

    this._readers.forEach(reader => {
      try {
        reader.destroy(new Error('FeedStore closed'));
      } catch (err) {
        // ignore
      }
    });

    await Promise.all(this
      .getDescriptors()
      .map(descriptor => descriptor.close())
    );

    this._descriptors.clear();

    await this._indexDB.close();

    this.emit('closed');
  }

  /**
   * Get the list of descriptors.
   */
  getDescriptors () {
    return Array.from(this._descriptors.values());
  }

  /**
   * Fast access to a descriptor
   */
  getDescriptorByDiscoveryKey (discoverKey: Buffer) {
    return this._descriptors.get(discoverKey.toString('hex'));
  }

  /**
   * Get the list of opened feeds, with optional filter.
   */
  getOpenFeeds (callback?: DescriptorCallback): Feed[] {
    const notNull = <T>(value: T | null): value is T => Boolean(value);
    return this.getDescriptors()
      .filter(descriptor => descriptor.opened && (!callback || callback(descriptor)))
      .map(descriptor => descriptor.feed)
      .filter(notNull);
  }

  /**
   * Find an opened feed using a filter callback.
   */
  getOpenFeed (callback: DescriptorCallback): Feed | undefined {
    const descriptor = this.getDescriptors()
      .find(descriptor => descriptor.opened && callback(descriptor));

    if (descriptor && descriptor.feed) {
      return descriptor.feed;
    }

    return undefined;
  }

  /**
   * Open multiple feeds using a filter callback.
   */
  @synchronized
  async openFeeds (callback: DescriptorCallback): Promise<Feed[]> {
    assert(this._open, 'FeedStore closed');

    const descriptors = this.getDescriptors()
      .filter(descriptor => callback(descriptor));

    return Promise.all(descriptors.map(descriptor => descriptor.open()));
  }

  /**
   * Open a feed to FeedStore.
   */
  @synchronized
  async openFeed (key: PublicKey): Promise<Feed> {
    assert(this._open, 'FeedStore closed');

    const descriptor = this.getDescriptors().find(fd => fd.key.equals(key));

    assert(descriptor, 'Descriptor not found');

    const feed = await descriptor.open();

    return feed;
  }

  /**
   * Create a feed to Feedstore
   */
  createReadWriteFeed (options: CreateReadWriteFeedOptions): FeedDescriptor {
    const descriptor = this._createDescriptor(options);

    return descriptor;
  }

  /**
   * Create a readonly feed to Feedstore
   */
  createReadOnlyFeed (options: CreateReadOnlyFeedOptions): FeedDescriptor {
    const descriptor = this._createDescriptor(options);

    return descriptor;
  }

  /**
   * Close a feed by the key.
   */
  @synchronized
  async closeFeed (key: PublicKey) {
    assert(this._open, 'FeedStore closed');

    const descriptor = this.getDescriptors().find(fd => fd.key.equals(key));

    if (!descriptor) {
      throw new Error(`Feed not found: ${key.toString()}`);
    }

    await descriptor.close();
  }

  /**
   * Remove all descriptors from the indexDB.
   *
   * NOTE: This operation would not close the feeds.
   */
  async deleteAllDescriptors () {
    return Promise.all(this.getDescriptors().map(({ key }) => this.deleteDescriptor(key)));
  }

  /**
   * Remove a descriptor from the indexDB by the key.
   *
   * NOTE: This operation would not close the feed.
   */
  @synchronized
  async deleteDescriptor (key: PublicKey) {
    assert(this._open, 'FeedStore closed');

    const descriptor = this.getDescriptors().find(fd => fd.key.equals(key));

    if (descriptor) {
      await descriptor.lock.executeSynchronized(async () => {
        await this._indexDB.delete(`${STORE_NAMESPACE}/${descriptor.key.toString()}`);

        this._descriptors.delete(descriptor.discoveryKey.toString('hex'));

        this.emit('descriptor-remove', descriptor);
      });
    }
  }

  /**
   * Creates a ReadableStream from the loaded feeds.
   *
   * @param callback Filter function to return options for each feed.createReadStream (returns `false` will ignore the feed) or default object options for each feed.createReadStream(options)
   */
  createReadStream (callback: StreamCallback | object = () => true): ReadableStream {
    return this._createReadStream(callback);
  }

  /**
   * Creates a ReadableStream from the loaded feeds and returns the messages in batch.
   *
   * @param callback Filter function to return options for each feed.createReadStream (returns `false` will ignore the feed) or default object options for each feed.createReadStream(options)
   */
  createBatchStream (callback: StreamCallback | object = () => true): ReadableStream {
    return this._createReadStream(callback, true);
  }

  /**
   * Factory to create a new FeedDescriptor.
   */
  private _createDescriptor (options: CreateDescriptorOptions) {
    const defaultOptions = this._defaultFeedOptions;

    const { key, secretKey, valueEncoding = defaultOptions.valueEncoding, metadata } = options;

    const descriptor = new FeedDescriptor({
      storage: this._storage,
      key,
      secretKey,
      valueEncoding,
      metadata,
      hypercore: this._hypercore,
      codecs: this._codecs
    });

    this._descriptors.set(
      descriptor.discoveryKey.toString('hex'),
      descriptor
    );

    const append = () => this.emit('append', descriptor.feed, descriptor);
    const download = (...args: any) => this.emit('download', ...args, descriptor.feed, descriptor);

    descriptor.watch(async (event) => {
      if (event === 'updated') {
        await this._persistDescriptor(descriptor);
        return;
      }

      const { feed } = descriptor;

      if (event === 'opened' && feed) {
        await this._persistDescriptor(descriptor);
        feed.on('append', append);
        feed.on('download', download);
        this.emit('feed', feed, descriptor);
        return;
      }

      if (event === 'closed' && feed) {
        feed.removeListener('append', append);
        feed.removeListener('download', download);
      }
    });

    return descriptor;
  }

  /**
   * Persist in the db the FeedDescriptor.
   */
  private async _persistDescriptor (descriptor: FeedDescriptor) {
    const key = `${STORE_NAMESPACE}/${descriptor.key?.toString()}`;

    const oldData = await this._indexDB.get(key);

    const newData = {
      key: descriptor.key,
      secretKey: descriptor.secretKey,
      valueEncoding: typeof descriptor.valueEncoding === 'string' ? descriptor.valueEncoding : undefined,
      metadata: descriptor.metadata
    };

    if (!oldData || JSON.stringify(oldData.metadata) !== JSON.stringify(newData.metadata)) {
      await this._indexDB.put(key, newData);
    }
  }

  private _createReadStream (callback: any, inBatch = false): ReadableStream {
    assert(this._open, 'FeedStore closed');

    const reader = new Reader(callback, inBatch);

    this._readers.add(reader);

    reader.onEnd(() => {
      this._readers.delete(reader);
    });

    (async () => {
      try {
        await reader.addInitialFeedStreams(this
          .getDescriptors()
          .filter(descriptor => descriptor.opened));
      } catch (err) {
        reader.destroy(err);
      }
    })();

    return reader.stream;
  }
}
