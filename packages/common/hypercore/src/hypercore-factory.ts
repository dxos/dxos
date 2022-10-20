//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import hypercore from 'hypercore';
import type { Hypercore, HypercoreOptions } from 'hypercore';

import { createStorage, Directory, StorageType } from '@dxos/random-access-storage';

/**
 * Creates feeds with default properties.
 *
 */
export class HypercoreFactory {
  constructor (
    private readonly _root: Directory = createStorage({ type: StorageType.RAM }).createDirectory(),
    private readonly _options?: HypercoreOptions
  ) {
    assert(this._root);
  }

  /**
   * Creates a feed using a storage factory prefixed with the feed's key.
   *
   * NOTE: We have to use our `random-access-storage` implementation since the native ones
   * do not behave uniformly across platforms.
   */
  createFeed (publicKey: Buffer, options?: HypercoreOptions): Hypercore<any> {
    const directory = this._root.createDirectory(publicKey.toString());
    const storage = (filename: string) => directory.getOrCreateFile(filename).native;
    return hypercore(storage, publicKey, Object.assign({}, this._options, options));
  }
}
