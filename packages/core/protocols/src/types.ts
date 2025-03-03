//
// Copyright 2020 DXOS.org
//

import { type PublicKey } from '@dxos/keys';
import { type Timeframe } from '@dxos/timeframe';

import { type CredentialsMessage, type FeedMessage } from './proto/gen/dxos/echo/feed.js';
import { type EchoObjectBatch } from './proto/gen/dxos/echo/object.js';

// TODO(burdon): Replace with proto definition.
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

// TODO(burdon): Reconcile HaloMessage with CredentialsMessage.
export interface IHaloStream {
  meta: FeedMeta;
  data: CredentialsMessage;
}

// TODO(burdon): EchoMessageWrapper.
export interface IEchoStream {
  meta: MutationMetaWithTimeframe;
  batch: EchoObjectBatch;
}

// TODO(burdon): Change to Buffer (same as key)?
export type ObjectId = string;
