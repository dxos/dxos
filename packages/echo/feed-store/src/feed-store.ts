//
// Copyright 2019 DXOS.org
//

import defaultHypercore from 'hypercore';
import assert from 'node:assert';

import { synchronized, Event } from '@dxos/async';
import type { Signer } from '@dxos/keyring';
import type { PublicKey } from '@dxos/protocols';
import { Directory } from '@dxos/random-access-storage';

import FeedDescriptor from './feed-descriptor';
import type { Hypercore } from './hypercore-types';
import type { ValueEncoding } from './types';

export interface CreateDescriptorOptions {
  key: PublicKey
  secretKey?: Buffer
  signer?: Signer
}

export interface CreateReadWriteFeedOptions {
  key: PublicKey
  secretKey: Buffer
}

export interface CreateReadOnlyFeedOptions {
  key: PublicKey
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
  private _directory: Directory;
  private _valueEncoding: ValueEncoding | undefined;
  private _hypercore: Hypercore;
  // TODO(dmaretskyi): Convert to ComplexMap.
  private _descriptors: Map<string, FeedDescriptor>;

  /**
   * Is emitted when a new feed represented by FeedDescriptor is opened.
   */
  readonly feedOpenedEvent = new Event<FeedDescriptor>();

  /**
   * @param directory RandomAccessStorage to use by default by the feeds.
   * @param options Feedstore options.
   */
  constructor (directory: Directory, options: FeedStoreOptions = {}) {
    assert(directory, 'The storage is required.');

    this._directory = directory;

    const {
      valueEncoding,
      hypercore = defaultHypercore
    } = options;
    this._valueEncoding = valueEncoding && patchBufferCodec(valueEncoding);

    this._hypercore = hypercore;

    this._descriptors = new Map();
  }

  /**
   * @type {RandomAccessStorage}
   */
  get storage () {
    return this._directory;
  }

  @synchronized
  async close () {
    await Promise.all(Array.from(this._descriptors.values()).map(descriptor => descriptor.close()));
    this._descriptors.clear();
  }

  /**
   * Create a feed to Feedstore
   * @deprecated Use openReadWriteFeedWithSigner instead.
   */
  async openReadWriteFeed (key: PublicKey, secretKey: Buffer): Promise<FeedDescriptor> {
    const descriptor = this._descriptors.get(key.toHex());
    if (descriptor && descriptor.secretKey) {
      return descriptor;
    }
    return this._createDescriptor({ key, secretKey });
  }

  /**
   * Opens read-write feed that uses a provided signer instead of built-in sodium crypto.
   */
  async openReadWriteFeedWithSigner (key: PublicKey, signer: Signer) {
    assert(!this._descriptors.has(key.toHex()), 'Feed already exists.');
    return this._createDescriptor({ key, signer });
  }

  /**
   * Create a readonly feed to Feedstore
   */
  async openReadOnlyFeed (key: PublicKey): Promise<FeedDescriptor> {
    const descriptor = this._descriptors.get(key.toHex()) ?? await this._createDescriptor({ key });
    return descriptor;
  }

  /**
   * Factory to create a new FeedDescriptor.
   */
  private async _createDescriptor (options: CreateDescriptorOptions) {
    const { key, secretKey, signer } = options;

    const descriptor = new FeedDescriptor({
      directory: this._directory,
      key,
      secretKey,
      signer,
      valueEncoding: this._valueEncoding,
      hypercore: this._hypercore
    });

    this._descriptors.set(
      descriptor.key.toString(),
      descriptor
    );

    await descriptor.open();
    this.feedOpenedEvent.emit(descriptor);

    return descriptor;
  }
}

const patchBufferCodec = (encoding: ValueEncoding): ValueEncoding => {
  if (typeof encoding === 'string') {
    return encoding;
  }

  return {
    encode: (x: any) => Buffer.from(encoding.encode(x)),
    decode: encoding.decode.bind(encoding)
  };
};
