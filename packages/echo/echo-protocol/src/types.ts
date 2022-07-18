//
// Copyright 2020 DXOS.org
//

import { Message as HaloMessage } from '@dxos/credentials';
import { PublicKey } from '@dxos/protocols';

import { EchoEnvelope, FeedMessage } from './proto';
import { Timeframe } from './spacetime/timeframe';

//
// Keys.
//

// TODO(burdon): Move defs to @dxos/crypto. Define KeyPair.
// TODO(telackey): Removing the specific PartyKey/FeedKey/IdentityKey types is advisable.
//  They are not different types of things, only distinct uses, and the same key may be used in more than one way.
//  (eg, as both the IdentityKey for the user and as the PartyKey for their HALO).

export type SwarmKey = Uint8Array;

//
// Feed.
//

export type FeedKey = PublicKey;

export type FeedMeta = {
  feedKey: FeedKey;
  seq: number;
}

export interface MutationMeta extends FeedMeta {
  memberKey: PublicKey
}

export interface MutationMetaWithTimeframe extends MutationMeta {
  timeframe: Timeframe
}

/**
 * Hypercore message.
 * https://github.com/hypercore-protocol/hypercore
 */
// TODO(burdon): Move to FeedStore (since not a hypercore data structure).
export interface IFeedGenericBlock<T> {
  // TODO(dmaretskyi): It's a buffer for some reason.
  key: FeedKey;
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

export type FeedBlock = IFeedGenericBlock<FeedMessage>

export interface IHaloStream {
  meta: FeedMeta
  // TODO(telackey): Rename `dxos.halo.IHaloEnvelope`.
  data: HaloMessage
}

export interface IEchoStream {
  meta: MutationMetaWithTimeframe
  data: EchoEnvelope
}

//
// Item.
//

// TODO(burdon): Change to Buffer.
export type ItemID = string;

export type ItemType = string;

//
// Party.
//

// TODO(burdon): How does this map into IPLD? And DXN?
// https://ipld.io
export type PartyKey = PublicKey;

//
// Identity.
//

export type IdentityKey = PublicKey;
