//
// Copyright 2019 DXOS.org
//

import assert from 'assert';
import jsonBuffer from 'buffer-json-encoding';
import { EventEmitter } from 'events';
import defaultHypercore from 'hypercore';
import hypertrie from 'hypertrie';
import nanoresource from 'nanoresource-promise';
import pEvent from 'p-event';

import FeedDescriptor from './feed-descriptor';
import IndexDB from './index-db';
import Reader from './reader';
import SelectiveReader from './selective-reader';

// TODO(burdon): Change to "dxos.feedstore"?
const STORE_NAMESPACE = '@feedstore';

type DescriptorCallback = (descriptor: FeedDescriptor) => boolean;
type StreamCallback = (descriptor: FeedDescriptor) => Object | undefined;

interface CreateDescriptorOptions {
  key?: Buffer,
  secretKey?: Buffer,
  valueEncoding?: string,
  metadata?: any
}

interface OpenFeedOptions {
  key?: Buffer,
  secretKey?: Buffer,
  valueEncoding?: string,
  metadata?: any
}

/**
 * FeedStore
 *
 * Management of multiple feeds to create, update, load, find and delete feeds
 * into a persist repository storage.
 *
 * @extends {EventEmitter}
 */
export class FeedStore extends EventEmitter {
	private _storage: any;
	private _database: any;
	private _defaultFeedOptions: any;
	private _codecs: any;
	private _hypercore: any;
	private _descriptors: Map<string, FeedDescriptor>;
	private _readers: Set<SelectiveReader | Reader>;
	private _indexDB: any;
	private _resource: any;
	public database: any;
	public feedOptions: any;
	public codecs: any;
	public hypercore: any;
	public key: any;
	public path: any;
	public options: any;
	public secretKey: any;
	public valueEncoding: any;
	public metadata: any;
	public feed: any;

  /**
   * Create and initialize a new FeedStore
   *
   * @static
   * @param {RandomAccessStorage} storage RandomAccessStorage to use by default by the feeds.
   * @param {Object} options
   * @param {Hypertrie=} options.database Defines a custom hypertrie database to index the feeds.
   * @param {Object=} options.feedOptions Default options for each feed.
   * @param {Object=} options.codecs Defines a list of available codecs to work with the feeds.
   * @param {Hypercore=} options.hypercore Hypercore class to use.
   * @returns {Promise<FeedStore>}
   * @deprecated
   */
  static async create (storage: any, options = {}) {
    const feedStore = new FeedStore(storage, options);
    await feedStore.open();
    return feedStore;
  }

  /**
   * constructor
   *
   * @param {RandomAccessStorage} storage RandomAccessStorage to use by default by the feeds.
   * @param {Object} options
   * @param {function=} options.database Defines a custom hypertrie database to index the feeds.
   * @param {Object=} options.feedOptions Default options for each feed.
   * @param {Object=} options.codecs Defines a list of available codecs to work with the feeds.
   * @param {Hypercore=} options.hypercore Hypercore class to use.
   */
  constructor (storage: any, options: any = {}) {
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

    this._resource = nanoresource({
      reopen: true,
      open: this._open.bind(this),
      close: this._close.bind(this)
    });

    this.on('feed', (_, descriptor) => {
      this._readers.forEach(reader => {
        reader.addFeedStream(descriptor).catch(err => {
          reader.destroy(err);
        });
      });
    });
  }

  get opened () {
    return this._resource.opened && !this._resource.closed;
  }

  get closed () {
    return this._resource.closed;
  }

  get opening () {
    return this._resource.opening;
  }

  get closing () {
    return this._resource.closing;
  }

  /**
   * @type {RandomAccessStorage}
   */
  get storage () {
    return this._storage;
  }

  /**
   * @returns {Promise}
   */
  open () {
    return this._resource.open();
  }

  /**
   * @returns {Promise}
   */
  close () {
    return this._resource.close();
  }

  /**
   * @returns {Promise}
   */
  async ready () {
    if (this.opened) {
      return;
    }

    try {
      await pEvent(this, 'opened', {
        rejectionEvents: ['closed']
      });
    } catch (err) {
      throw new Error('FeedStore closed');
    }
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
   *
   * @param {DescriptorCallback} [callback]
   * @returns {Hypercore[]}
   */
  getOpenFeeds (callback?: DescriptorCallback) {
    return this.getDescriptors()
      .filter(descriptor => descriptor.opened && (!callback || callback(descriptor)))
      .map(descriptor => descriptor.feed);
  }

  /**
   * Find an opened feed using a filter callback.
   *
   * @param {DescriptorCallback} callback
   * @returns {Hypercore}
   */
  getOpenFeed (callback: DescriptorCallback) {
    const descriptor = this.getDescriptors()
      .find(descriptor => descriptor.opened && callback(descriptor));

    if (descriptor) {
      return descriptor.feed;
    }
  }

  /**
   * Open multiple feeds using a filter callback.
   *
   * @param {DescriptorCallback} callback
   * @returns {Promise<Hypercore[]>}
   */
  async openFeeds (callback: DescriptorCallback) {
    await this._isOpen();

    const descriptors = this.getDescriptors()
      .filter(descriptor => callback(descriptor));

    return Promise.all(descriptors.map(descriptor => descriptor.open()));
  }

  /**
   * Open a feed to FeedStore.
   *
   * If the feed already exists but is not loaded it will load the feed instead of
   * creating a new one.
   *
   * Similar to fs.open
   *
   * @param {string} path
   * @param {Object} options
   * @param {Buffer} options.key
   * @param {Buffer} options.secretKey
   * @param {string} options.valueEncoding
   * @param {*} options.metadata
   * @returns {Hypercore}
   */
  async openFeed (path: string, options: OpenFeedOptions = {}) {
    assert(path, 'Missing path');

    await this._isOpen();

    if (!this._resource.active()) {
      throw new Error('FeedStore closed');
    }

    try {
      const { key } = options;

      let descriptor = this.getDescriptors().find(fd => fd.path === path);

      if (descriptor && key && descriptor.key && !key.equals(descriptor.key)) {
        throw new Error(`Invalid public key "${key.toString('hex')}"`);
      }

      if (!descriptor && key && this.getDescriptors().find(fd => fd.key?.equals(key))) {
        throw new Error(`Feed exists with same public key "${key.toString('hex')}"`);
      }

      if (!descriptor) {
        descriptor = this._createDescriptor(path, options);
      }

      const feed = await descriptor.open();

      this._resource.inactive();
      return feed;
    } catch (err) {
      this._resource.inactive();
      throw err;
    }
  }

  /**
   * Close a feed by the path.
   */
  async closeFeed (path: string) {
    assert(path, 'Missing path');

    await this._isOpen();

    if (!this._resource.active()) {
      throw new Error('FeedStore closed');
    }

    try {
      const descriptor = this.getDescriptors().find(fd => fd.path === path);

      if (!descriptor) {
        throw new Error(`Feed not found: ${path}`);
      }

      await descriptor.close();
      this._resource.inactive();
    } catch (err) {
      this._resource.inactive();
      throw err;
    }
  }

  /**
   * Remove all descriptors from the indexDB.
   *
   * NOTE: This operation would not close the feeds.
   *
   * @returns {Promise<Promise[]>}
   */
  async deleteAllDescriptors () {
    return Promise.all(this.getDescriptors().map(({ path }) => this.deleteDescriptor(path)));
  }

  /**
   * Remove a descriptor from the indexDB by the path.
   *
   * NOTE: This operation would not close the feed.
   */
  async deleteDescriptor (path: string) {
    assert(path, 'Missing path');

    await this._isOpen();

    if (!this._resource.active()) {
      throw new Error('FeedStore closed');
    }

    const descriptor = this.getDescriptors().find(fd => fd.path === path);

    let release;
    if (descriptor) {
      try {
        release = await descriptor.lock();
  
        await this._indexDB.delete(`${STORE_NAMESPACE}/${descriptor.key?.toString('hex')}`);
  
        this._descriptors.delete(descriptor.discoveryKey.toString('hex'));
  
        this.emit('descriptor-remove', descriptor);
        await release();
        this._resource.inactive();
      } catch (err) {
        if (release) {
          await release();
        }
        this._resource.inactive();
        throw err;
      }
    }
  }

  /**
   * Creates a ReadableStream from the loaded feeds.
   *
   * @param {StreamCallback|Object} [callback] Filter function to return options for each feed.createReadStream (returns `false` will ignore the feed) or default object options for each feed.createReadStream(options)
   * @returns {ReadableStream}
   */
  createReadStream (callback: StreamCallback | object = () => true) {
    return this._createReadStream(callback);
  }

  createSelectiveStream (evaluator: (feedDescriptor: FeedDescriptor, message: object) => Promise<boolean>) {
    const reader = new SelectiveReader(evaluator);

    this._readers.add(reader);

    this
      ._isOpen()
      .then(() => {
        return reader.addInitialFeedStreams(this
          .getDescriptors()
          .filter(descriptor => descriptor.opened));
      })
      .catch(err => {
        reader.destroy(err);
      });

    return reader;
  }

  /**
   * Creates a ReadableStream from the loaded feeds and returns the messages in batch.
   *
   * @param {StreamCallback|Object} [callback] Filter function to return options for each feed.createReadStream (returns `false` will ignore the feed) or default object options for each feed.createReadStream(options)
   * @returns {ReadableStream}
   */
  createBatchStream (callback: StreamCallback | object = () => true) {
    return this._createReadStream(callback, true);
  }

  /**
   * Initialized FeedStore reading the persisted options and created each FeedDescriptor.
   *
   * @returns {Promise}
   */
  async _open () {
    this._indexDB = new IndexDB(this._database(this._storage, { valueEncoding: jsonBuffer }));

    const list = await this._indexDB.list(STORE_NAMESPACE);

    list.forEach((data: any) => {
      const { path, ...options } = data;
      this._createDescriptor(path, options);
    });

    this.emit('opened');

    // backward compatibility
    this.emit('ready');
  }

  /**
   * Close the hypertrie and their feeds.
   *
   */
  async _close () {
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
   * Factory to create a new FeedDescriptor.
   */
  private _createDescriptor (path: string, options: CreateDescriptorOptions) {
    const defaultOptions = this._defaultFeedOptions;

    const { key, secretKey, valueEncoding = defaultOptions.valueEncoding, metadata } = options;

    const descriptor = new FeedDescriptor(path, {
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

      if (event === 'opened') {
        await this._persistDescriptor(descriptor);
        feed.on('append', append);
        feed.on('download', download);
        this.emit('feed', feed, descriptor);
        return;
      }

      if (event === 'closed') {
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
    const key = `${STORE_NAMESPACE}/${descriptor.key?.toString('hex')}`;

    const oldData = await this._indexDB.get(key);

    const newData = {
      path: descriptor.path,
      key: descriptor.key,
      secretKey: descriptor.secretKey,
      valueEncoding: typeof descriptor.valueEncoding === 'string' ? descriptor.valueEncoding : undefined,
      metadata: descriptor.metadata
    };

    if (!oldData || (JSON.stringify(oldData.metadata) !== JSON.stringify(newData.metadata))) {
      await this._indexDB.put(key, newData);
    }
  }

  private async _isOpen () {
    if (this.closing || this.closed) {
      throw new Error('FeedStore closed');
    }

    if (this.opened) {
      return;
    }

    return this.ready();
  }

  private _createReadStream (callback: any, inBatch = false) {
    const reader = new Reader(callback, inBatch);

    this._readers.add(reader);

    reader.onEnd(() => {
      this._readers.delete(reader);
    });

    this
      ._isOpen()
      .then(() => {
        return reader.addInitialFeedStreams(this
          .getDescriptors()
          .filter(descriptor => descriptor.opened));
      })
      .catch(err => {
        reader.destroy(err);
      });

    return reader.stream;
  }

  /**
   * Old initialize method keep it for backward compatibility
   */
  initialize () {
    return this.open();
  }
}
