//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { decodeError, encodeError } from './errors/encoding.ts';
import { type TYPES, schema } from './proto/gen/index.ts';

/**
 * Effect schema for a protobuf message type, encoded as protobuf bytes on the wire.
 * Reuses the proto codec substitutions (PublicKey, Timeframe, etc.) so values survive
 * binary transports and transports that cannot preserve class prototypes (e.g. structured clone).
 */
export const protoMessage = <K extends keyof TYPES & string>(typeName: K): Schema.Schema<TYPES[K], Uint8Array> =>
  Schema.transform(
    Schema.Uint8ArrayFromSelf,
    Schema.declare<TYPES[K]>((_): _ is TYPES[K] => true),
    {
      strict: true,
      decode: (bytes) => schema.getCodecForType(typeName).decode(bytes),
      encode: (value) => schema.getCodecForType(typeName).encode(value),
    },
  );

/**
 * Error channel schema for service RPCs.
 * Encodes via the `dxos.error.Error` protobuf message and reconstructs registered error
 * classes on decode so typed errors cross the RPC boundary.
 */
export const serviceError: Schema.Schema<Error, Uint8Array> = Schema.transform(
  Schema.Uint8ArrayFromSelf,
  Schema.declare<Error>((value): value is Error => value instanceof Error),
  {
    strict: true,
    decode: (bytes) => decodeError(schema.getCodecForType('dxos.error.Error').decode(bytes)),
    encode: (error) => schema.getCodecForType('dxos.error.Error').encode(encodeError(error)),
  },
);
