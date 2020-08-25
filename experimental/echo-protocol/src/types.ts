//
// Copyright 2020 DXOS.org
//

import { dxos } from './proto';

//
// Feed
//

export type FeedKey = Uint8Array;

export type FeedMeta = {
  feedKey: FeedKey;
  seq: number;
}

/**
 * Hypercore message.
 * https://github.com/hypercore-protocol/hypercore
 */
// TODO(burdon): Move to FeedStore (since not a hypercore data structure).
export interface IFeedGenericBlock<T> {
  key: Buffer; // TODO(burdon): Change to FeedKey?
  seq: number;
  sync: boolean;
  path: string;
  data: T;
}

/**
 * Constructs a meta object from the raw stream object.
 * @param block
 */
export const createFeedMeta = (block: IFeedGenericBlock<any>): FeedMeta => ({
  feedKey: block.key,
  seq: block.seq
});

export type FeedBlock = IFeedGenericBlock<dxos.FeedMessage>;

export interface IHaloStream {
  meta: FeedMeta;
  data: dxos.halo.IHaloEnvelope;
}

export interface IEchoStream {
  meta: FeedMeta;
  data: dxos.echo.IEchoEnvelope;
}

//
// Item
//

// TODO(burdon): Change to Buffer.
export type ItemID = string;

export type ItemType = string;

//
// Party
//

export type PartyKey = Uint8Array;
