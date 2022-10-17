//
// Copyright 2020 DXOS.org
//

import { TypedProtoMessage } from '@dxos/codec-protobuf';
import { FeedBlock } from '@dxos/hypercore';
import { PublicKey } from '@dxos/keys';

import { TYPES } from './proto';
import { EchoEnvelope, FeedMessage, CredentialsMessage } from './proto/gen/dxos/echo/feed';
import { Timeframe } from './timeframe';

export type TypedMessage = TypedProtoMessage<TYPES>

// TODO(burdon): Replace with proto definition.
export type FeedMeta = {
  feedKey: PublicKey
  seq: number
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
