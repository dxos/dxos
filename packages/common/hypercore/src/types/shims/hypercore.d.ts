//
// Copyright 2022 DXOS.org
//

/**
 * https://www.npmjs.com/package/hypercore/v/9.12.0
 */
declare module 'hypercore' {
  import type { RandomAccessFileConstructor } from '@dxos/random-access-storage';

  import type { FeedOptions, HypercoreConstructor, HypercoreFeedObject } from '../hypercore-feed';

  // Default constructor.
  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-feed--hypercorestorage-key-options
  export const hypercore: HypercoreConstructor = (
    storage: RandomAccessFileConstructor,
    key?: Buffer | string,
    options?: FeedOptions
  ) => HypercoreFeedObject;

  export = hypercore;
}
