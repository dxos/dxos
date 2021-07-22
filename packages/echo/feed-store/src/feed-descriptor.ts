//
// Copyright 2019 DXOS.org
//

import assert from 'assert';
import defaultHypercore from 'hypercore';
import crypto from 'hypercore-crypto';
import path from 'path';
import pify from 'pify';
import raf from 'random-access-file';
import sodium from 'sodium-universal';

import Locker from './locker';

interface ValueEncoding {
  encode: string,
  decode: string
}

interface FeedDescriptorOptions {
  storage?: any,
  key?: Buffer,
  secretKey?: Buffer,
  valueEncoding?: string | ValueEncoding,
  metadata?: any,
  codecs?: object,
  hypercore?: any
}

type Listener = ((...args: any) => Promise<void> | void) | null;

/**
 * FeedDescriptor
 *
 * Abstract handler for an Hypercore instance.
 */
export class FeedDescriptor {
	private _storage: any;
	private _path: string;
	private _key: Buffer;
	private _secretKey: Buffer;
	private _valueEncoding?: string | ValueEncoding;
	private _hypercore: any;
	private _codecs: any;
	private _metadata: any;
	private _discoveryKey: Buffer;
	private _locker: Locker;
	private _feed: any;
	private _listener: Listener;

  /**
   * constructor
   *
   * @param {string} path
   * @param {Object} options
   * @param {RandomAccessStorage} options.storage
   * @param {Buffer} options.key
   * @param {Buffer} options.secretKey
   * @param {Object|string} options.valueEncoding
   * @param {*} options.metadata
   * @param {Hypercore} options.hypercore
   */
  constructor (path: string, options: FeedDescriptorOptions = {}) {
    const {
      storage,
      key,
      secretKey,
      valueEncoding,
      hypercore = defaultHypercore,
      codecs = {},
      metadata
    } = options;

    assert(path, 'path is required and must be a valid string.');
    assert(!key || key.length === sodium.crypto_sign_PUBLICKEYBYTES, 'key must be a buffer of size crypto_sign_PUBLICKEYBYTES.');
    assert(!secretKey || secretKey.length === sodium.crypto_sign_SECRETKEYBYTES, 'secretKey must be a buffer of size crypto_sign_SECRETKEYBYTES.');
    assert(!secretKey || (secretKey && key), 'missing publicKey.');
    assert(!valueEncoding || typeof valueEncoding === 'string' || (valueEncoding.encode && valueEncoding.decode),
      'valueEncoding must be a string or implement abstract-encoding.');

    this._storage = storage;
    this._path = path;
    this._valueEncoding = valueEncoding;
    this._hypercore = hypercore;
    this._codecs = codecs;
    this._metadata = metadata;

    if (!key || !secretKey) {
      const { publicKey, secretKey } = crypto.keyPair();
      this._key = publicKey;
      this._secretKey = secretKey;
    } else {
      this._key = key;
      this._secretKey = secretKey;
    }

    this._discoveryKey = crypto.discoveryKey(this._key);

    this._locker = new Locker();

    this._feed = null;
    this._listener = null;
  }

  get path () {
    return this._path;
  }

  /**
   * @type {Hypercore|null}
   */
  get feed () {
    return this._feed;
  }

  get opened () {
    return !!(this._feed && this._feed.opened && !this._feed.closed);
  }

  get key () {
    return this._key;
  }

  get secretKey () {
    return this._secretKey;
  }

  get discoveryKey () {
    return this._discoveryKey;
  }

  get valueEncoding () {
    return this._valueEncoding;
  }

  get metadata () {
    return this._metadata;
  }

  async setMetadata (metadata: any) {
    this._metadata = metadata;
    await this._emit('updated');
  }

  /*
   * Lock the resource.
   *
   * @returns {function} release
   */
  async lock () {
    return this._locker.lock();
  }

  /**
   * Open an Hypercore feed based on the related feed options.
   *
   * This is an atomic operation, FeedDescriptor makes
   * sure that the feed is not going to open again.
   *
   * @returns {Promise<Hypercore>}
   */
  async open () {
    const release = await this.lock();

    if (this.opened) {
      await release();
      return this._feed;
    }

    try {
      await this._open();
      await this._emit('opened');
      await release();
      return this._feed;
    } catch (err) {
      await release();
      throw err;
    }
  }

  /**
   * Close the Hypercore referenced by the descriptor.
   */
  async close () {
    const release = await this.lock();

    if (!this.opened) {
      await release();
      return;
    }

    try {
      await pify(this._feed.close.bind(this._feed))();
      await this._emit('closed');
      await release();
    } catch (err) {
      await release();
      throw err;
    }
  }

  /**
   * Watch for descriptor events.
   *
   * @param {function} listener
   */
  watch (listener: Listener) {
    this._listener = listener;
  }

  /**
   * Defines the real path where the Hypercore is going
   * to work with the RandomAccessStorage specified.
   */
  private _createStorage (dir: string = ''): (name: string) => any {
    const ras = this._storage;

    return (name) => {
      if (typeof ras === 'string') {
        return raf(path.join(ras, dir, name));
      }
      return ras(`${dir}/${name}`);
    };
  }

  private async _open () {
    this._feed = this._hypercore(
      this._createStorage(this._key?.toString('hex')),
      this._key,
      {
        secretKey: this._secretKey,
        valueEncoding: (typeof this._valueEncoding === 'string' && this._codecs[this._valueEncoding]) ||
          this._valueEncoding
      }
    );

    await pify(this._feed.ready.bind(this._feed))();
  }

  /**
   * Asynchronous emitter.
   */
  private async _emit (event: any, ...args: any) {
    if (this._listener) {
      await this._listener(event, ...args);
    }
  }
}

export default FeedDescriptor;
