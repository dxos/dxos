//
// Copyright 2022 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type Directory, StorageType, createStorage } from '@dxos/random-access-storage';
import hypercore from '@dxos/vendor-hypercore/hypercore';
import type { Hypercore, HypercoreOptions } from '@dxos/vendor-hypercore/hypercore';

import { py } from './util.ts';

/**
 * Creates hypercores with default properties.
 */
export class RawHypercoreFactory<T> {
  constructor(
    private readonly _root: Directory = createStorage({ type: StorageType.RAM }).createDirectory(),
    private readonly _options?: HypercoreOptions,
  ) {
    invariant(this._root);
  }

  /**
   * Creates a hypercore using a storage factory prefixed with the hypercore's key.
   * NOTE: We have to use our `random-access-storage` implementation since the native ones
   * do not behave uniformly across platforms.
   */
  createHypercore(publicKey: Buffer, options?: HypercoreOptions): Hypercore<T> {
    const directory = this._root.createDirectory(publicKey.toString('hex'));
    const storage = (filename: string) => directory.getOrCreateFile(filename).native;
    return hypercore(storage, publicKey, Object.assign({}, this._options, options));
  }

  /**
   * Creates and opens a hypercore.
   */
  async openHypercore(publicKey: Buffer, options?: HypercoreOptions): Promise<Hypercore<T>> {
    const feed = this.createHypercore(publicKey, options);
    await py(feed, feed.open)(); // TODO(burdon): Sometimes strange bug if done inside function.
    return feed;
  }
}
