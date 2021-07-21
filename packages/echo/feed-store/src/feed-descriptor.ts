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

/**
 * FeedDescriptor
 *
 * Abstract handler for an Hypercore instance.
 */
export class FeedDescriptor {
	public _storage: any;
	public _path: any;
	public _key: any;
	public _secretKey: any;
	public _valueEncoding: any;
	public _hypercore: any;
	public _codecs: any;
	public _metadata: any;
	public _discoveryKey: any;
	public _locker: any;
	public _feed: any;
	public _listener: any;
	public storage: any;
	public hypercore: any;
	public codecs: any;
	public publicKey: any;

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
  constructor (path?, options = {}) {
    const {
      storage,
      key,
      secretKey,
      valueEncoding,
      hypercore = defaultHypercore,
      codecs = {},
      metadata
    } = options;

    assert(path && typeof path === 'string' && path.length > 0,
      'path is required and must be a valid string.');
    assert(!key || (Buffer.isBuffer(key) && key.length === sodium.crypto_sign_PUBLICKEYBYTES),
      'key must be a buffer of size crypto_sign_PUBLICKEYBYTES.');
    assert(!secretKey || (Buffer.isBuffer(secretKey) && secretKey.length === sodium.crypto_sign_SECRETKEYBYTES),
      'secretKey must be a buffer of size crypto_sign_SECRETKEYBYTES.');
    assert(!secretKey || (secretKey && key),
      'missing publicKey.');
    assert(!valueEncoding || typeof valueEncoding === 'string' || (valueEncoding.encode && valueEncoding.decode),
      'valueEncoding must be a string or implement abstract-encoding.');

    this._storage = storage;
    this._path = path;
    this._key = key;
    this._secretKey = secretKey;
    this._valueEncoding = valueEncoding;
    this._hypercore = hypercore;
    this._codecs = codecs;
    this._metadata = metadata;

    if (!this._key) {
      const { publicKey, secretKey } = crypto.keyPair();
      this._key = publicKey;
      this._secretKey = secretKey;
    }

    this._discoveryKey = crypto.discoveryKey(this._key);

    this._locker = new Locker();

    this._feed = null;
    this._listener = null;
  }

  /**
   * @type {string}
   */
  get path () {
    return this._path;
  }

  /**
   * @type {Hypercore|null}
   */
  get feed () {
    return this._feed;
  }

  /**
   * @type {Boolean}
   */
  get opened () {
    return !!(this._feed && this._feed.opened && !this._feed.closed);
  }

  /**
   * @type {Buffer}
   */
  get key () {
    return this._key;
  }

  /**
   * @type {Buffer}
   */
  get secretKey () {
    return this._secretKey;
  }

  /**
   * @type {Buffer}
   */
  get discoveryKey () {
    return this._discoveryKey;
  }

  /**
   * @type {Object|string}
   */
  get valueEncoding () {
    return this._valueEncoding;
  }

  /**
   * @type {*}
   */
  get metadata () {
    return this._metadata;
  }

  /**
   * @param {*} metadata
   * @returns {Promise}
   */
  async setMetadata (metadata) {
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
   *
   * @returns {Promise}
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
  watch (listener) {
    this._listener = listener;
  }

  /**
   * Defines the real path where the Hypercore is going
   * to work with the RandomAccessStorage specified.
   *
   * @private
   * @param {string} dir
   * @returns {Function}
   */
  _createStorage (dir) {
    const ras = this._storage;

    return (name) => {
      if (typeof ras === 'string') {
        return raf(path.join(ras, dir, name));
      }
      return ras(`${dir}/${name}`);
    };
  }

  async _open () {
    this._feed = this._hypercore(
      this._createStorage(this._key.toString('hex')),
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
  async _emit (event, ...args) {
    if (this._listener) {
      await this._listener(event, ...args);
    }
  }
}

export default FeedDescriptor;
