//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/keys';

/**
 * Protobuf encoding.
 */
export type ValueEncoding = string | {
  encode: (data: any) => Uint8Array
  decode: (data: Uint8Array) => any
}

/**
 * Hypercore message block.
 * https://github.com/hypercore-protocol/hypercore
 */
export type FeedBlock<T> = {
  key: PublicKey
  seq: number
  sync: boolean
  path: string
  data: T
}
