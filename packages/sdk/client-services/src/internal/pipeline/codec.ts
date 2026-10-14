//
// Copyright 2022 DXOS.org
//

import { fromBinary, toBinary } from '@bufbuild/protobuf';

import { type ValueCodec, createCodecEncoding } from '@dxos/hypercore';
import { type FeedMessage, FeedMessageSchema } from '@dxos/protocols/buf/dxos/echo/feed_pb';

/**
 * Codec for feed messages.
 */
export const codec: ValueCodec<FeedMessage> = {
  encode: (value) => toBinary(FeedMessageSchema, value),
  decode: (buffer) => fromBinary(FeedMessageSchema, buffer),
};

/**
 * Value encoding used by feed store.
 */
export const valueEncoding = createCodecEncoding(codec);
