//
// Copyright 2020 DXOS.org
//

// eslint-disable-next-line camelcase
import { dxos as halo_dxos } from '@dxos/credentials';

import { protocol } from './proto';

//
// Keys
//

// TODO(burdon): Move defs to @dxos/crypto. Define KeyPair.
// TODO(telackey): Removing the specific PartyKey/FeedKey/IdentityKey types is advisable.
//  They are not different types of things, only distinct uses, and the same key may be used in more than one way
//  (e.g., as both the IdentityKey for the user and as the PartyKey for their HALO).

export type PublicKey = Uint8Array;

export type SwarmKey = PublicKey;

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

export type FeedBlock = IFeedGenericBlock<protocol.dxos.FeedMessage>;

export interface IHaloStream {
  meta: FeedMeta;
  // TODO(telackey): Rename dxos.halo.IHaloEnvelope
  // eslint-disable-next-line camelcase
  data: halo_dxos.credentials.Message;
}

export interface IEchoStream {
  meta: FeedMeta;
  data: protocol.dxos.echo.IEchoEnvelope;
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

// TODO(burdon): How does this map into IPLD? (https://ipld.io) and WRN?
export type PartyKey = PublicKey;

//
// Identity
//

export type IdentityKey = PublicKey;
