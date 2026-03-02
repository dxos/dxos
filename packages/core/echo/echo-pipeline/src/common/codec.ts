//
// Copyright 2022 DXOS.org
//

import { type Codec } from '@dxos/codec-protobuf';
import { createCodecEncoding } from '@dxos/hypercore';
import { bufToTimeframe, create, toBinary, fromBinary } from '@dxos/protocols/buf';
import { type FeedMessage, FeedMessageSchema } from '@dxos/protocols/buf/dxos/echo/feed_pb';

/**
 * Codec for feed messages.
 * Encode wraps with create() to ensure all nested messages have $typeName.
 * Decode converts buf TimeframeVector back to Timeframe for pipeline compatibility.
 */
export const codec: Codec<FeedMessage> = {
  encode: (msg: FeedMessage) => toBinary(FeedMessageSchema, create(FeedMessageSchema, msg)),
  decode: (bytes: Uint8Array) => {
    const msg = fromBinary(FeedMessageSchema, bytes);
    if (msg.timeframe) {
      (msg as any).timeframe = bufToTimeframe(msg.timeframe);
    }
    return msg;
  },
};

/**
 * Value encoding used by feed store.
 */
export const valueEncoding = createCodecEncoding(codec);
