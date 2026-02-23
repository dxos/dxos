//
// Copyright 2024 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { EmptySchema } from '@bufbuild/protobuf/wkt';

import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

import * as KeysPb from './proto/gen/dxos/keys_pb';
import {
  type TimeframeVector,
  TimeframeVectorSchema,
} from './proto/gen/dxos/echo/timeframe_pb';

export * as buf from '@bufbuild/protobuf';
export * as bufWkt from '@bufbuild/protobuf/wkt';
export * as bufCodegen from '@bufbuild/protobuf/codegenv2';

// Re-export commonly used types and functions.
export {
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
} from '@bufbuild/protobuf';
export {
  type Empty,
  EmptySchema,
  timestampDate,
  timestampFromDate,
  timestampMs,
  type Timestamp,
} from '@bufbuild/protobuf/wkt';
export { type GenService, type GenServiceMethods } from '@bufbuild/protobuf/codegenv2';

/** @deprecated Use `create` instead. */
export { create as createBuf } from '@bufbuild/protobuf';

export const EMPTY = create(EmptySchema);

export const encodePublicKey = (publicKey: PublicKey): KeysPb.PublicKey => {
  return create(KeysPb.PublicKeySchema, {
    data: publicKey.asUint8Array(),
  });
};

export const decodePublicKey = (publicKey: KeysPb.PublicKey): PublicKey => {
  return new PublicKey(publicKey.data);
};

//
// Proto/buf boundary cast helpers.
// These are safe at runtime because proto and buf share the same wire format (generated from the same .proto files).
// They make the boundary casts self-documenting and auditable.
//

/** Cast buf type to proto equivalent at a codec/feed boundary. */
export const bufToProto = <T>(value: unknown): T => value as T;

/** Cast proto type to buf equivalent after codec/feed decoding. */
export const protoToBuf = <T>(value: unknown): T => value as T;

/** Convert a Timeframe instance to buf TimeframeVector message. */
export const timeframeToBuf = (timeframe: Timeframe): TimeframeVector =>
  create(TimeframeVectorSchema, {
    frames: timeframe.frames().map(([feedKey, seq]) => ({ feedKey: feedKey.asUint8Array(), seq })),
  });
