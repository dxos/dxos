//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/keys';

// TODO(burdon): Move defs to new package `@dxos/feeds`.

export type FeedMeta = {
  feedKey: PublicKey
  seq: number
}

/**
 * Hypercore message.
 * https://github.com/hypercore-protocol/hypercore
 */
// TODO(burdon): Rename (No I-prefix).
export type IFeedGenericBlock<T> = {
  key: PublicKey
  seq: number
  sync: boolean
  path: string
  data: T
}

/**
 * Constructs a meta object from the raw stream object.
 * @param block
 */
export const createFeedMeta = (block: IFeedGenericBlock<any>): FeedMeta => ({
  feedKey: block.key,
  seq: block.seq
});

export type ValueEncoding = string | {
  encode: (data: any) => Uint8Array
  decode: (data: Uint8Array) => any
}
