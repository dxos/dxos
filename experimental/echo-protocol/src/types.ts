//
// Copyright 2020 DXOS.org
//

import { dxos } from './proto';
import { dxos as dxoshalo } from '@dxos/credentials';

//
// Keys
//

// TODO(telackey): Removing the specific PartyKey/FeedKey/IdentityKey types is advisable. They are not different
// types of things, only distinct uses, and the same key may be used in more than one way (eg, as both the IdentityKey
// for the user and as the PartyKey for their HALO).

export type PublicKey = Uint8Array;

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
  data: dxoshalo.halo.IHaloEnvelope;
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

export type PartyKey = PublicKey;

//
// Identity
//

export type IdentityKey = PublicKey;
