//
// Copyright 2020 DXOS.org
//

import { TypedProtoMessage } from '@dxos/codec-protobuf';
import { PublicKey, Timeframe } from '@dxos/protocols';

import { CredentialsMessage, EchoEnvelope, FeedMessage, TYPES } from './proto';

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

export type FeedKey = PublicKey

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
export interface IFeedGenericBlock<T> {
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

// TODO(dmaretskyi): Rename to Message.
export type FeedBlock = IFeedGenericBlock<FeedMessage>

export interface IHaloStream {
  meta: FeedMeta
  data: CredentialsMessage
}

export interface IEchoStream {
  meta: MutationMetaWithTimeframe
  data: EchoEnvelope
}

//
// Messages
//

// TODO(burdon): Conflict with halo-protocol MessageType.
export type TypedMessage = TypedProtoMessage<TYPES>

//
// Item
//

// TODO(burdon): Change to Buffer.
export type ItemID = string;

export type ItemType = string;

//
// Party
//

// TODO(burdon): Spacekey.
// TODO(burdon): How does this map into IPLD? And DXN?
// https://ipld.io
export type PartyKey = PublicKey;

//
// Identity
//

export type IdentityKey = PublicKey;
