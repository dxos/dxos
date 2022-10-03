//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/keys';

// TODO(burdon): Move to codec-protobuf?
export type ValueEncoding = string | {
  encode: (data: any) => Uint8Array
  decode: (data: Uint8Array) => any
}

/**
 * Hypercore message block.
 * https://github.com/hypercore-protocol/hypercore
 */
// TODO(burdon): Reconcile with hypercore-types.ts
export type FeedBlock<T> = {
  key: PublicKey
  seq: number
  sync: boolean
  path: string
  data: T
}
