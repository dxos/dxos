//
// Copyright 2022 DXOS.org
//

import { type Codec } from '@dxos/codec-protobuf';
import { createCodecEncoding } from '@dxos/hypercore';
import { toBinary, fromBinary } from '@dxos/protocols/buf';
import { type FeedMessage, FeedMessageSchema } from '@dxos/protocols/buf/dxos/echo/feed_pb';

/**
 * Codec for feed messages.
 */
export const codec: Codec<FeedMessage> = {
  encode: (msg: FeedMessage) => toBinary(FeedMessageSchema, msg),
  decode: (bytes: Uint8Array) => fromBinary(FeedMessageSchema, bytes),
};

/**
 * Value encoding used by feed store.
 */
export const valueEncoding = createCodecEncoding(codec);
