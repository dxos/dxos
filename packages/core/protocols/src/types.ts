//
// Copyright 2020 DXOS.org
//

import { TypedProtoMessage } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';

import { TYPES } from './proto';
import { EchoEnvelope, FeedMessage, CredentialsMessage } from './proto/gen/dxos/echo/feed';
import { Timeframe } from './timeframe';

/**
 * Discriminated union of all protobuf types with the '@type' field included.
 * Useful for typing 'google.protobuf.Any' messages.
 */
// TODO(burdon): Rename.
export type MessageType = {
  [K in keyof TYPES]: TYPES[K] & { '@type': K }
}[keyof TYPES]

// TODO(burdon): Conflict with halo-protocol MessageType.
export type TypedMessage = TypedProtoMessage<TYPES>

// TODO(burdon): Change to Buffer (same as key).
export type ItemID = string;
export type ItemType = string;

//
// Feeds.
//

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

export interface MutationMeta extends FeedMeta {
  memberKey: PublicKey
}

export interface MutationMetaWithTimeframe extends MutationMeta {
  timeframe: Timeframe
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

// TODO(burdon): Reconcile HaloMessage with CredentialsMessage.
export interface IHaloStream {
  meta: FeedMeta
  data: CredentialsMessage
}

// TODO(burdon): EchoMessageWrapper.
export interface IEchoStream {
  meta: MutationMetaWithTimeframe
  data: EchoEnvelope
}
