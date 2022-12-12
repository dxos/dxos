//
// Copyright 2022 DXOS.org
//

import hypercore from 'hypercore';
import type { Hypercore, HypercoreOptions } from 'hypercore';
import assert from 'node:assert';

import { createStorage, Directory, StorageType } from '@dxos/random-access-storage';

import { py } from './util';

/**
 * Creates feeds with default properties.
 */
export class HypercoreFactory<T> {
  // prettier-ignore
  constructor(
    private readonly _root: Directory = createStorage({ type: StorageType.RAM }).createDirectory(),
    private readonly _options?: HypercoreOptions
  ) {
    assert(this._root);
  }

  /**
   * Creates a feed using a storage factory prefixed with the feed's key.
   * NOTE: We have to use our `random-access-storage` implementation since the native ones
   * do not behave uniformly across platforms.
   */
  createFeed(publicKey: Buffer, options?: HypercoreOptions): Hypercore<T> {
    const directory = this._root.createDirectory(publicKey.toString());
    const storage = (filename: string) => directory.getOrCreateFile(filename).native;
    return hypercore(storage, publicKey, Object.assign({}, this._options, options));
  }

  /**
   * Creates and opens a feed.
   */
  async openFeed(publicKey: Buffer, options?: HypercoreOptions): Promise<Hypercore<T>> {
    const feed = this.createFeed(publicKey, options);
    await py(feed, feed.open)(); // TODO(burdon): Sometimes strange bug if done inside function.
    return feed;
  }
}
