//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import hypercore from 'hypercore';
import pify from 'pify';
import ram from 'random-access-memory';

import { sha256 } from '@dxos/crypto';
import type { RandomAccessFileConstructor } from '@dxos/random-access-storage';

import { defaultFeedOptions } from './defaults';
import { HypercoreFeed } from './hypercore-feed';
import type { FeedOptions } from './types';

/**
 * Hypercore wrapper factory.
 */
export class HypercoreFactory {
  constructor (
    private readonly _storage: RandomAccessFileConstructor = ram,
    private readonly _prefix?: string
  ) {
    assert(this._storage);
  }

  /**
   * Creates a pify wrapped hypercore object.
   */
  create (publicKey?: Buffer, options?: FeedOptions): HypercoreFeed {
    // TODO(burdon): Pluggable???
    const key = publicKey ? Buffer.from(sha256(publicKey.toString('hex'))) : undefined;
    const feed = hypercore(this._storage, publicKey, options ?? defaultFeedOptions);

    // Wrap async methods.
    return Object.assign(feed, {
      open: pify(feed.open).bind(feed),
      close: pify(feed.close).bind(feed),
      append: pify(feed.append).bind(feed),
      flush: pify(feed.flush).bind(feed),
      head: pify(feed.head).bind(feed),
      get: pify(feed.get).bind(feed),
      getBatch: pify(feed.getBatch).bind(feed),
      download: pify(feed.download).bind(feed)
    });
  }
}
