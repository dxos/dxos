//
// Copyright 2020 DXOS.org
//

import { TypedProtoMessage } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { IFeedGenericBlock, FeedMeta } from '@dxos/feed-store';

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
// Proto defs
//

// TODO(dmaretskyi): Rename to Message.
export type FeedBlock = IFeedGenericBlock<FeedMessage>

export interface MutationMeta extends FeedMeta {
  memberKey: PublicKey
}

export interface MutationMetaWithTimeframe extends MutationMeta {
  timeframe: Timeframe
}

// TODO(burdon): Reconcile HaloMessage with CredentialsMessage.
export interface IHaloStream {
  meta: FeedMeta
  data: CredentialsMessage
}

export interface IEchoStream {
  meta: MutationMetaWithTimeframe
  data: EchoEnvelope
}
