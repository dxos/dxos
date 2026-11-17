//
// Copyright 2026 DXOS.org
//

import { Encoder, decode } from 'cbor-x';
import * as Schema from 'effect/Schema';

import { FeedProtocol } from '@dxos/protocols';

// Plain arrays and maps, as EDGE's feed sync encodes them, so either side can read the other's frames.
const encoder = new Encoder({ tagUint8Array: false, useRecords: false });

const decodeMessage = Schema.decodeUnknownSync(Schema.toType(FeedProtocol.ProtocolMessage));

/**
 * Encodes a feed protocol message as one binary socket frame.
 */
export const encodeFrame = (message: FeedProtocol.ProtocolMessage): Uint8Array<ArrayBuffer> =>
  // A copy into a plain `ArrayBuffer`, which `WebSocket.send` takes and a pooled `Buffer` is not.
  new Uint8Array(encoder.encode(message));

/**
 * Decodes and validates one socket frame.
 *
 * @throws When the frame is not a feed protocol message.
 */
export const decodeFrame = (frame: Uint8Array): FeedProtocol.ProtocolMessage => decodeMessage(decode(frame));
