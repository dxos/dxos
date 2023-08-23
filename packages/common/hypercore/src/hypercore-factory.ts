//
// Copyright 2022 DXOS.org
//

import Hypercore, { HypercoreOptions } from 'hypercore';

import { invariant } from '@dxos/invariant';
import { createStorage, Directory, StorageType } from '@dxos/random-access-storage';

/**
 * Creates feeds with default properties.
 */
export class HypercoreFactory<T> {
  // prettier-ignore
  constructor(
    private readonly _root: Directory = createStorage({ type: StorageType.RAM }).createDirectory(),
    private readonly _options?: HypercoreOptions
  ) {
    invariant(this._root);
  }

  /**
   * Creates a feed using a storage factory prefixed with the feed's key.
   * NOTE: We have to use our `random-access-storage` implementation since the native ones
   * do not behave uniformly across platforms.
   */
  // TODO(burdon): Make async (ready not open).
  createFeed(publicKey: Buffer, options?: HypercoreOptions): Hypercore<T> {
    const directory = this._root.createDirectory(publicKey.toString());
    const storage = (filename: string) => directory.getOrCreateFile(filename).native;
    return new Hypercore(storage, publicKey, Object.assign({}, this._options, options));
  }

  /**
   * Creates and opens a feed.
   */
  async openFeed(publicKey: Buffer, options?: HypercoreOptions): Promise<Hypercore<T>> {
    const feed = this.createFeed(publicKey, options);

    // await py(feed, feed.open)(); // TODO(burdon): Sometimes strange bug if done inside function.
    return feed;
  }
}
