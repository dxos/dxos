//
// Copyright 2019 DXOS.org
//

import assert from 'assert';
import defaultHypercore from 'hypercore';

import { synchronized, Event } from '@dxos/async';
import { PublicKey, PublicKeyLike } from '@dxos/crypto';
import { IStorage } from '@dxos/random-access-multi-storage';

import FeedDescriptor from './feed-descriptor';
import type { HypercoreFeed, Hypercore } from './hypercore-types';
import type { ValueEncoding } from './types';

type DescriptorCallback = (descriptor: FeedDescriptor) => boolean;

export interface CreateDescriptorOptions {
  key: PublicKey,
  secretKey?: Buffer
}

export interface CreateReadWriteFeedOptions {
  key: PublicKey,
  secretKey: Buffer
}

export interface CreateReadOnlyFeedOptions {
  key: PublicKey
}

export interface KeyRecord {
  publicKey: PublicKey,
  secretKey?: Buffer
}

export interface FeedStoreOptions {
  /**
   * Encoding type for each feed.
   */
  valueEncoding?: ValueEncoding
  /**
   * Hypercore class to use.
   */
  hypercore?: Hypercore
}

/**
 * FeedStore
 *
 * Management of multiple feeds to create, update, load, find and delete feeds
 * into a persist repository storage.
 */
export class FeedStore {
  private _storage: IStorage;
  private _valueEncoding: ValueEncoding | undefined;
  private _hypercore: Hypercore;
  private _descriptors: Map<string, FeedDescriptor>;
  private _open: boolean;

  /**
   * Is emitted when data gets appended to one of the FeedStore's feeds represented by FeedDescriptors.
   */
  readonly appendEvent = new Event<FeedDescriptor>();

  /**
   * Is emitted when a new feed represented by FeedDescriptor is opened.
   */
  readonly feedOpenedEvent = new Event<FeedDescriptor>();

  /**
   * @param storage RandomAccessStorage to use by default by the feeds.
   * @param options Feedstore options.
   */
  constructor (storage: IStorage, options: FeedStoreOptions = {}) {
    assert(storage, 'The storage is required.');

    this._storage = storage;

    const {
      valueEncoding,
      hypercore = defaultHypercore
    } = options;
    this._valueEncoding = valueEncoding && patchBufferCodec(valueEncoding);

    this._hypercore = hypercore;

    this._descriptors = new Map();

    this._open = false;
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
  }

  @synchronized
  async close () {
    if (!this._open) {
      return;
    }
    this._open = false;

    await Promise.all(this
      .getDescriptors()
      .map(descriptor => descriptor.close())
    );

    this._descriptors.clear();
  }

  /**
   * Get the list of descriptors.
   */
  getDescriptors () {
    return Array.from(this._descriptors.values());
  }

  /**
   * Get desciptor by its public key
   */
  getDescriptor (key: PublicKeyLike) {
    return this.getDescriptors().find(descriptor => descriptor.key.equals(key));
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
  getOpenFeeds (callback?: DescriptorCallback): HypercoreFeed[] {
    const notNull = <T>(value: T | null): value is T => Boolean(value);
    return this.getDescriptors()
      .filter(descriptor => descriptor.opened && (!callback || callback(descriptor)))
      .map(descriptor => descriptor.feed)
      .filter(notNull);
  }

  /**
   * Find an opened feed using a filter callback.
   */
  getOpenFeed (callback: DescriptorCallback): HypercoreFeed | undefined {
    const descriptor = this.getDescriptors()
      .find(descriptor => descriptor.opened && callback(descriptor));

    if (descriptor && descriptor.feed) {
      return descriptor.feed;
    }

    return undefined;
  }

  /**
   * Checks if feedstore has a feed with specified key.
   */
  hasFeed (key: PublicKeyLike): boolean {
    return this.getDescriptors().some(fd => fd.key.equals(key));
  }

  /**
   * Open multiple feeds using a filter callback.
   */
  @synchronized
  async openFeeds (callback: DescriptorCallback): Promise<HypercoreFeed[]> {
    assert(this._open, 'FeedStore closed');

    const descriptors = this.getDescriptors()
      .filter(descriptor => callback(descriptor));

    return Promise.all(descriptors.map(descriptor => descriptor.open()));
  }

  /**
   * Open a feed to FeedStore.
   */
  @synchronized
  async openFeed (key: PublicKey): Promise<HypercoreFeed> {
    assert(this._open, 'FeedStore closed');

    const descriptor = this.getDescriptors().find(fd => fd.key.equals(key));

    assert(descriptor, 'Descriptor not found');

    const feed = await descriptor.open();

    return feed;
  }

  /**
   * Create a feed to Feedstore
   */
  async createReadWriteFeed (options: CreateReadWriteFeedOptions): Promise<HypercoreFeed> {
    this._createDescriptor(options);
    return this.openFeed(options.key);
  }

  /**
   * Create a readonly feed to Feedstore
   */
  async createReadOnlyFeed (options: CreateReadOnlyFeedOptions): Promise<HypercoreFeed> {
    this._createDescriptor(options);
    return this.openFeed(options.key);
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
   * Factory to create a new FeedDescriptor.
   */
  private _createDescriptor (options: CreateDescriptorOptions) {
    const { key, secretKey } = options;

    const existing = this.getDescriptors().find(fd => fd.key.equals(key));
    if (existing) {
      return existing;
    }

    const descriptor = new FeedDescriptor({
      storage: this._storage,
      key,
      secretKey,
      valueEncoding: this._valueEncoding,
      hypercore: this._hypercore
    });

    this._descriptors.set(
      descriptor.discoveryKey.toString('hex'),
      descriptor
    );

    const append = () => this.appendEvent.emit(descriptor);

    descriptor.watch(async (event) => {
      if (event === 'updated') {
        return;
      }

      const { feed } = descriptor;

      if (event === 'opened' && feed) {
        feed.on('append', append);
        this.feedOpenedEvent.emit(descriptor);
        return;
      }

      if (event === 'closed' && feed) {
        feed.removeListener('append', append);
      }
    });

    return descriptor;
  }
}

function patchBufferCodec (encoding: ValueEncoding): ValueEncoding {
  if (typeof encoding === 'string') {
    return encoding;
  }
  return {
    encode: (x: any) => Buffer.from(encoding.encode(x)),
    decode: encoding.decode.bind(encoding)
  };
}
