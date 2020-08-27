//
// Copyright 2020 DXOS.org
//

import { dxos } from './proto';

export type PublicKey = Buffer;

//
// Feed
//

export type FeedKey = PublicKey;

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
  data: any
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

// TODO(telackey): Having a single PublicKey type would make more sense than inventing a distinct type for each use
// that a PublicKey might be put to, especially since in some cases the same key might be put to more than one use
// (eg, the user's IdentityKey used as the PartyKey for their personal HALO) or keys representing different entities
// in the real world be put to the same use (eg, adding both Device and Identity keys as members of Parties).

//
// Party
//

export type PartyKey = PublicKey;

//
// Identity
//

export type IdentityKey = PublicKey;
