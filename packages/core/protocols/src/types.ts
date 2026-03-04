//
// Copyright 2020 DXOS.org
//

import { type PublicKey } from '@dxos/keys';
import { type Timeframe } from '@dxos/timeframe';

import { type CredentialsMessage, type FeedMessage } from './buf/proto/gen/dxos/echo/feed_pb.ts';
import { type EchoObjectBatch } from './buf/proto/gen/dxos/echo/object_pb.ts';

export type FeedMeta = {
  feedKey: PublicKey;
  seq: number;
};

export type FeedBlock<T> = {
  feedKey: PublicKey;
  seq: number;
  data: T;
};

export type FeedMessageBlock = FeedBlock<FeedMessage>;

export interface MutationMeta extends FeedMeta {
  memberKey: PublicKey;
}

export interface MutationMetaWithTimeframe extends MutationMeta {
  timeframe: Timeframe;
}

export interface IHaloStream {
  meta: FeedMeta;
  data: CredentialsMessage;
}

export interface IEchoStream {
  meta: MutationMetaWithTimeframe;
  batch: EchoObjectBatch;
}

export type ObjectId = string;

/**
 * Generic encoder/decoder interface.
 */
export interface Codec<T> {
  encode(obj: T): Uint8Array;
  decode(buffer: Uint8Array): T;
}
