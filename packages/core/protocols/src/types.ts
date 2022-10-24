//
// Copyright 2020 DXOS.org
//

import { TypedProtoMessage } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

import { TYPES } from './proto';
import { EchoEnvelope, FeedMessage, CredentialsMessage } from './proto/gen/dxos/echo/feed';

// TODO(burdon): Rename ProtocolMessage.
export type TypedMessage = TypedProtoMessage<TYPES>

// TODO(burdon): Replace with proto definition.
export type FeedMeta = {
  feedKey: PublicKey
  seq: number
}

export type FeedBlock<T> = {
  feedKey: PublicKey
  seq: number
  data: T
}

export type FeedMessageBlock = FeedBlock<FeedMessage>

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

// TODO(burdon): EchoMessageWrapper.
export interface IEchoStream {
  meta: MutationMetaWithTimeframe
  data: EchoEnvelope
}

// TODO(burdon): Change to Buffer (same as key).
export type ItemID = string
export type ItemType = string
