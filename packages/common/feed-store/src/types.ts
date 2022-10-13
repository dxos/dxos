//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/keys';

/**
 * Hypercore message block.
 * https://github.com/hypercore-protocol/hypercore
 */
// TODO(burdon): Move to hypercore?
export type FeedBlock<T> = {
  key: PublicKey
  seq: number
  sync: boolean
  path: string
  data: T
}
