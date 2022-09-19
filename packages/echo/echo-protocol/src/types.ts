//
// Copyright 2020 DXOS.org
//

import { PublicKey, Timeframe } from '@dxos/protocols';
import { EchoEnvelope, FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Message as HaloMessage } from '@dxos/protocols/proto/dxos/halo/signed';

// TODO(burdon): Move defs to @dxos/protocols.

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
  feedKey: FeedKey
  seq: number
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
  key: FeedKey
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

export type FeedBlock = IFeedGenericBlock<FeedMessage>

// TODO(burdon): HaloMessageWrapper.
// TODO(burdon): Reconcile HaloMessage with CredentialsMessage.
export interface IHaloStream {
  meta: FeedMeta
  data: HaloMessage
}

// TODO(burdon): EchoMessageWrapper.
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
