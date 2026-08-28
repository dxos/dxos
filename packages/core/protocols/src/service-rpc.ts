//
// Copyright 2026 DXOS.org
//

import { type Message, fromBinary, toBinary } from '@bufbuild/protobuf';
import { type GenMessage } from '@bufbuild/protobuf/codegenv2';
import * as Schema from 'effect/Schema';
import * as SchemaTransformation from 'effect/SchemaTransformation';

import { bufRegistry } from './buf/registry.ts';
import { decodeCompat, encodeCompat } from './buf/shape-compat.ts';
import { decodeError, encodeError } from './errors/encoding.ts';
import { type TYPES, schema } from './proto/gen/index.ts';

/**
 * Effect schema for a protobuf message type, encoded as protobuf bytes on the wire.
 * Values keep the protobuf.js field shapes whichever codec carries them.
 */
export const protoMessage = <K extends keyof TYPES & string>(typeName: K): Schema.Codec<TYPES[K], Uint8Array> => {
  const desc = bufRegistry.getMessage(typeName);
  return Schema.Uint8Array.pipe(
    Schema.decodeTo(
      Schema.declare<TYPES[K]>((_): _ is TYPES[K] => true),
      SchemaTransformation.transform({
        decode: (bytes) =>
          desc !== undefined ? decodeCompat(desc, bytes) : schema.getCodecForType(typeName).decode(bytes),
        encode: (value) =>
          desc !== undefined ? encodeCompat(desc, value) : schema.getCodecForType(typeName).encode(value),
      }),
    ),
  );
};

/** Matches `protoMessage`'s wire format while exposing the buf message type to callers. */
export const bufMessage = <T extends Message>(messageSchema: GenMessage<T>): Schema.Codec<T, Uint8Array> =>
  Schema.Uint8Array.pipe(
    Schema.decodeTo(
      Schema.declare<T>((_): _ is T => true),
      SchemaTransformation.transform({
        decode: (bytes) => fromBinary(messageSchema, bytes),
        encode: (value) => toBinary(messageSchema, value),
      }),
    ),
  );

/**
 * Error channel schema for service RPCs.
 * Encodes via the `dxos.error.Error` protobuf message and reconstructs registered error
 * classes on decode so typed errors cross the RPC boundary.
 */
export const serviceError: Schema.Codec<Error, Uint8Array> = (() => {
  const desc = bufRegistry.getMessage('dxos.error.Error');
  return Schema.Uint8Array.pipe(
    Schema.decodeTo(
      Schema.declare<Error>((value): value is Error => value instanceof Error),
      SchemaTransformation.transform({
        decode: (bytes) =>
          decodeError(
            desc !== undefined ? decodeCompat(desc, bytes) : schema.getCodecForType('dxos.error.Error').decode(bytes),
          ),
        encode: (error) => {
          const encoded = encodeError(error);
          return desc !== undefined
            ? encodeCompat(desc, encoded)
            : schema.getCodecForType('dxos.error.Error').encode(encoded);
        },
      }),
    ),
  );
})();
