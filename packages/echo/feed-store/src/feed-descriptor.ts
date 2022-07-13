//
// Copyright 2019 DXOS.org
//

import assert from 'assert';
import defaultHypercore from 'hypercore';
import pify from 'pify';
import { callbackify } from 'util';

import { Lock } from '@dxos/async';
import type { PublicKey } from '@dxos/protocols';
import type { Directory } from '@dxos/random-access-multi-storage';

import type { HypercoreFeed, Hypercore } from './hypercore-types';
import type { ValueEncoding } from './types';

interface FeedDescriptorOptions {
  directory: Directory,
  key: PublicKey,
  hypercore: Hypercore,
  secretKey?: Buffer,
  valueEncoding?: ValueEncoding
  disableSigning?: boolean
}

/**
 * FeedDescriptor
 *
 * Abstract handler for an Hypercore instance.
 */
export class FeedDescriptor {
  private readonly _directory: Directory;
  private readonly _key: PublicKey;
  private readonly _secretKey?: Buffer;
  private readonly _valueEncoding?: ValueEncoding;
  private readonly _hypercore: Hypercore;
  private readonly _lock: Lock;
  private readonly _disableSigning: boolean;

  private _feed: HypercoreFeed | null;

  constructor (options: FeedDescriptorOptions) {
    const {
      directory,
      key,
      secretKey,
      valueEncoding,
      hypercore = defaultHypercore,
      disableSigning = false
    } = options;

    this._directory = directory;
    this._valueEncoding = valueEncoding;
    this._hypercore = hypercore;
    this._key = key;
    this._secretKey = secretKey;
    this._disableSigning = !!disableSigning;

    this._lock = new Lock();

    this._feed = null;
  }

  get feed (): HypercoreFeed {
    assert(this._feed, 'Feed is not initialized');
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

  get valueEncoding () {
    return this._valueEncoding;
  }

  get writable () {
    return !!this.secretKey;
  }

  /**
   * Open an Hypercore feed based on the related feed options.
   *
   * This is an atomic operation, FeedDescriptor makes
   * sure that the feed is not going to open again.
   */
  async open (): Promise<HypercoreFeed> {
    if (this.opened) {
      return this.feed;
    }

    await this._lock.executeSynchronized(async () => {
      await this._open();
    });
    return this.feed;
  }

  /**
   * Close the Hypercore referenced by the descriptor.
   */
  async close () {
    if (!this.opened) {
      return;
    }

    await this._lock.executeSynchronized(async () => {
      await pify(this._feed?.close.bind(this._feed))();
    });
  }

  /**
   * Defines the real path where the Hypercore is going
   * to work with the RandomAccessStorage specified.
   */

  private _createStorage (dir = ''): (name: string) => HypercoreFile {
    return (name) => {
      const file = this._directory.createOrOpen(`${dir}/${name}`);
      // Separation between our internal File API and Hypercore's.
      return {
        read: callbackify(file.read.bind(file)),
        write: callbackify(file.write.bind(file)),
        del: callbackify(file.truncate.bind(file)),
        stat: callbackify(file.stat.bind(file)),
        close: callbackify(file.close.bind(file)),
        destroy: callbackify(file.delete.bind(file))
      } as HypercoreFile;
    };
  }

  private async _open () {
    this._feed = this._hypercore(
      this._createStorage(this._key.toString()),
      this._key.asBuffer(),
      {
        secretKey: this._secretKey,
        valueEncoding: this._valueEncoding,
        crypto: this._disableSigning ? MOCK_CRYPTO : undefined
      }
    );

    await pify(this._feed.ready.bind(this._feed))();
  }

  append (message: any): Promise<void> {
    assert(this._feed);
    return pify(this._feed.append.bind(this._feed))(message);
  }
}

export default FeedDescriptor;

const MOCK_CRYPTO = {
  sign: (data: any, secretKey: any, cb: any) => {
    cb(null, Buffer.from(''));
  },
  verify: (signature: any, data: any, key: any, cb: any) => {
    cb(null, true);
  }
};

/**
 * File API that hypercore uses to read/write from storage.
 */
interface HypercoreFile {
  read (offset: number, size: number, cb?: (err: Error | null, data?: Buffer) => void): void;
  write (offset: number, data: Buffer, cb?: (err: Error | null) => void): void;
  del (offset: number, size: number, cb?: (err: Error | null) => void): void;
  stat (cb: (err: Error | null, data?: {size: number}) => void): void;
  close (cb?: (err: Error | null) => void): void;
  destroy (cb?: (err: Error | null) => void): void;
}
