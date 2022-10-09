//
// Copyright 2022 DXOS.org
//

declare module 'hypercore' {
  import type { RandomAccessFileConstructor } from '@dxos/random-access-storage';

  import type { FeedOptions } from './hypercore';

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-feed--hypercorestorage-key-options
  export type Constructor = (storage: RandomAccessFileConstructor, key?: Buffer | string, options?: FeedOptions) => Hypercore

  // Default constructor.
  export const hypercore: Constructor;

  export = hypercore;
}
