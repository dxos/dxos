//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/keys';

export type FeedMeta = {
  feedKey: PublicKey
  seq: number
}

/**
 * Hypercore message.
 * https://github.com/hypercore-protocol/hypercore
 */
// TODO(burdon): Rename (No I-prefix).
export interface IFeedGenericBlock<T> {
  key: PublicKey
  seq: number
  sync: boolean
  path: string
  data: T
}

export type ValueEncoding = string | {
  encode: (x: any) => Uint8Array
  decode: (data: Uint8Array) => any
};
