//
// Copyright 2026 DXOS.org
//

import { type Message, fromBinary, toBinary } from '@bufbuild/protobuf';
import { type GenMessage } from '@bufbuild/protobuf/codegenv2';
import * as Schema from 'effect/Schema';
import * as SchemaTransformation from 'effect/SchemaTransformation';

import { ErrorSchema } from './buf/proto/gen/dxos/error_pb.ts';
import { decodeError, encodeError } from './errors/encoding.ts';

/** Encodes a buf message as protobuf bytes on the wire. */
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
export const serviceError: Schema.Codec<Error, Uint8Array> = Schema.Uint8Array.pipe(
  Schema.decodeTo(
    Schema.declare<Error>((value): value is Error => value instanceof Error),
    SchemaTransformation.transform({
      decode: (bytes) => decodeError(fromBinary(ErrorSchema, bytes)),
      encode: (error) => toBinary(ErrorSchema, encodeError(error)),
    }),
  ),
);
