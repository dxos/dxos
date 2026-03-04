//
// Copyright 2024 DXOS.org
//

import {
  create,
  type DescMessage,
  fromBinary,
  type Message,
  type MessageShape,
  type Registry,
  toBinary,
} from '@bufbuild/protobuf';
import { EmptySchema, type Any, AnySchema, anyIs } from '@bufbuild/protobuf/wkt';

import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

import { type TimeframeVector, TimeframeVectorSchema } from './proto/gen/dxos/echo/timeframe_pb.ts';
import * as KeysPb from './proto/gen/dxos/keys_pb.ts';

export * as buf from '@bufbuild/protobuf';
export * as bufWkt from '@bufbuild/protobuf/wkt';
export * as bufCodegen from '@bufbuild/protobuf/codegenv2';

// Re-export commonly used types and functions.
export {
  type MessageInitShape,
  create,
  fromBinary,
  toBinary,
  type DescMessage,
  type DescMethod,
  type DescService,
  type JsonObject,
  type JsonValue,
  type Message,
  type MessageShape,
  fromJson,
  toJson,
} from '@bufbuild/protobuf';
export {
  type Empty,
  EmptySchema,
  timestampDate,
  timestampFromDate,
  timestampMs,
  type Any,
  AnySchema,
  type Timestamp,
} from '@bufbuild/protobuf/wkt';
export { type GenService, type GenServiceMethods } from '@bufbuild/protobuf/codegenv2';

export const EMPTY = create(EmptySchema);

export const encodePublicKey = (publicKey: PublicKey): KeysPb.PublicKey => {
  return create(KeysPb.PublicKeySchema, {
    data: publicKey.asUint8Array(),
  });
};

export const decodePublicKey = (publicKey: KeysPb.PublicKey | { data: Uint8Array }): PublicKey => {
  return new PublicKey(publicKey.data);
};

/** Converts buf PublicKey or @dxos/keys PublicKey to @dxos/keys PublicKey. Use when key type may be either. */
export const toPublicKey = (key: KeysPb.PublicKey | PublicKey | { data: Uint8Array }): PublicKey =>
  key instanceof PublicKey ? key : decodePublicKey(key);

export const TimeframeVectorProto = Object.freeze({
  encode: (timeframe: Timeframe) =>
    create(TimeframeVectorSchema, {
      frames: timeframe.frames().map(([feedKey, seq]) => ({ feedKey: feedKey.asUint8Array(), seq })),
    }),
  decode: (vector: TimeframeVector) =>
    new Timeframe(vector?.frames?.map((frame) => [PublicKey.from(frame.feedKey), frame.seq]) ?? []),
  totalMessages: (vector: TimeframeVector) => vector.frames.reduce((total, frame) => total + frame.seq + 1, 0),
  newMessages: (vector: TimeframeVector, base: TimeframeVector) => {
    const baseMap = new Map<string, number>(
      base?.frames?.map((frame) => [PublicKey.from(frame.feedKey).toHex(), frame.seq]) ?? [],
    );
    return vector.frames.reduce(
      (total, frame) => total + Math.max(frame.seq - (baseMap.get(PublicKey.from(frame.feedKey).toHex()) ?? -1), 0),
      0,
    );
  },
});

/**
 * Packs the message into a buf Any.
 */
export function anyPack<Desc extends DescMessage>(schema: Desc, message: MessageShape<Desc>): Any {
  // Does not add google prefix to typeUrl
  return create(AnySchema, {
    typeUrl: schema.typeName,
    value: toBinary(schema, message),
  });
}

/**
 * Unpacks the message the Any represents.
 *
 * Returns undefined if the Any is empty, or if it does not contain the type
 * given by schema.
 */
export function anyUnpack(any: Any, registry: Registry): Message | undefined;
export function anyUnpack<Desc extends DescMessage>(any: Any, schema: Desc): MessageShape<Desc> | undefined;
export function anyUnpack<Desc extends DescMessage>(
  any: Any,
  schemaOrRegistry: Desc | Registry,
): MessageShape<Desc> | undefined {
  if (any.typeUrl === '') {
    return undefined;
  }
  const desc = schemaOrRegistry.kind == 'message' ? schemaOrRegistry : schemaOrRegistry.getMessage(any.typeUrl);
  if (!desc || !anyIs(any, desc)) {
    return undefined;
  }
  return fromBinary(desc, any.value) as any;
}
