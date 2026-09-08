//
// Copyright 2022 DXOS.org
//

import { type ValueCodec, createCodecEncoding } from '@dxos/hypercore';
import { compatCodec } from '@dxos/protocols/buf-shape-compat';
import { FeedMessageSchema } from '@dxos/protocols/buf/dxos/echo/feed_pb';
import type { FeedMessage } from '@dxos/protocols/buf/dxos/echo/feed_pb';

/**
 * Codec for feed messages.
 */
// A credential's signature covers the canonical stringification of the decoded object, not the
// envelope's bytes, so the codec carrying it can change; `codec.test.ts` asserts that directly. The
// shape stays protobuf.js because the pipeline reads its substitutions (PublicKey, Timeframe).
export const codec: ValueCodec<FeedMessage> = compatCodec<FeedMessage>(FeedMessageSchema);

/**
 * Value encoding used by feed store.
 */
export const valueEncoding = createCodecEncoding(codec);
