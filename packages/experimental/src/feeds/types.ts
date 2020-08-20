//
// Copyright 2020 DXOS.org
//

import { dxos } from '../proto/gen/testing';

export type FeedKey = Uint8Array;

/**
 * Hypercore message.
 * https://github.com/hypercore-protocol/hypercore
 */
// TODO(burdon): Move to FeedStore (since not a hypercore data structure).
export interface IFeedGenericBlock<T> {
  key: Buffer; // TODO(burdon): Rename feedKey if defined in FeedStore?
  seq: number;
  data: T;
  sync: boolean;
  path: string;
}

export type IFeedBlock = IFeedGenericBlock<dxos.echo.testing.FeedMessage>;

/**
 * Feed metadata.
 */
export interface IFeedMeta {
  feedKey: FeedKey;
  seq: number;
}

/**
 * Constructs a meta object from the raw stream object.
 * @param block
 */
export const createFeedMeta = (block: IFeedGenericBlock<any>) => ({
  feedKey: block.key,
  seq: block.seq
});

/**
 *
 */
export const createExpectedFeedBlock = (data: any) => ({
  key: expect.any(Buffer),
  seq: expect.any(Number),
  sync: expect.any(Boolean),
  data
});
