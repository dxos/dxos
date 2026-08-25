//
// Copyright 2026 DXOS.org
//

import { type DescMessage, type Message, fromBinary, toBinary } from '@bufbuild/protobuf';
import { type GenMessage } from '@bufbuild/protobuf/codegenv2';
import * as Schema from 'effect/Schema';
import * as SchemaTransformation from 'effect/SchemaTransformation';

import { bufRegistry } from './buf/registry.ts';
import { decodeCompat, encodeCompat } from './buf/shape-compat.ts';
import { decodeError, encodeError } from './errors/encoding.ts';
import { type TYPES, schema } from './proto/gen/index.ts';

const ANY_TYPE_NAME = 'google.protobuf.Any';

/**
 * Whether any field reachable from `desc` is a `google.protobuf.Any`, which the shape-compat layer
 * cannot represent. Recursion is guarded because protobuf messages may be mutually recursive
 * (`KeyChain` holds `SignedMessage`, which holds `KeyChain`).
 */
const containsAny = (desc: DescMessage, seen = new Set<string>()): boolean => {
  if (seen.has(desc.typeName)) {
    return false;
  }
  seen.add(desc.typeName);
  return desc.fields.some((field) => {
    const nested =
      field.fieldKind === 'message' || field.fieldKind === 'list' || field.fieldKind === 'map'
        ? field.message
        : undefined;
    return nested !== undefined && (nested.typeName === ANY_TYPE_NAME || containsAny(nested, seen));
  });
};

/**
 * The buf descriptor to encode `typeName` through, or `undefined` to stay on the protobuf.js codec.
 * Resolved once per `protoMessage()` call rather than per message, so a type that buf cannot carry
 * is a startup-time routing decision instead of a runtime throw on the first payload.
 */
const bufDescriptorFor = (typeName: string): DescMessage | undefined => {
  const desc = bufRegistry.getMessage(typeName);
  return desc !== undefined && !containsAny(desc) ? desc : undefined;
};

/**
 * Effect schema for a protobuf message type, encoded as protobuf bytes on the wire.
 * Values keep the protobuf.js field shapes (`PublicKey`, `Timeframe`, plain-object `Struct`, `Date`)
 * whichever codec runs, so callers cannot observe which one carried a given type.
 */
export const protoMessage = <K extends keyof TYPES & string>(typeName: K): Schema.Codec<TYPES[K], Uint8Array> => {
  const desc = bufDescriptorFor(typeName);
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
  const desc = bufDescriptorFor('dxos.error.Error');
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
