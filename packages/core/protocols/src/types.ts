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
 * Options for encoding/decoding.
 */
export interface EncodingOptions {
  /**
   * If enabled, google.protobuf.Any will not be recursively decoded.
   */
  preserveAny?: boolean;
}

/**
 * Generic encoder/decoder interface.
 */
export interface Codec<T> {
  encode(obj: T, opts?: EncodingOptions): Uint8Array;
  decode(buffer: Uint8Array, opts?: EncodingOptions): T;
}
