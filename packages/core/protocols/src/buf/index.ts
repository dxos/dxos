//
// Copyright 2024 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { EmptySchema } from '@bufbuild/protobuf/wkt';

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
  anyPack,
  anyUnpack,
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

/** Convert a Timeframe instance to buf TimeframeVector message. */
export const timeframeToBuf = (timeframe: Timeframe): TimeframeVector =>
  create(TimeframeVectorSchema, {
    frames: timeframe.frames().map(([feedKey, seq]) => ({ feedKey: feedKey.asUint8Array(), seq })),
  });

/** Convert a buf TimeframeVector message to Timeframe instance. */
export const bufToTimeframe = (vector?: TimeframeVector): Timeframe =>
  new Timeframe(vector?.frames?.map((frame) => [PublicKey.from(frame.feedKey), frame.seq]) ?? []);

/** Compute total messages represented by a TimeframeVector (equivalent to Timeframe.totalMessages). */
export const timeframeVectorTotalMessages = (vector?: TimeframeVector): number =>
  vector?.frames?.reduce((total, frame) => total + frame.seq + 1, 0) ?? 0;

/** Compute new messages in a TimeframeVector relative to a base (equivalent to Timeframe.newMessages). */
export const timeframeVectorNewMessages = (vector?: TimeframeVector, base?: TimeframeVector): number => {
  if (!vector?.frames) {
    return 0;
  }
  const baseMap = new Map<string, number>(
    base?.frames?.map((frame) => [PublicKey.from(frame.feedKey).toHex(), frame.seq]) ?? [],
  );
  return vector.frames.reduce(
    (total, frame) => total + Math.max(frame.seq - (baseMap.get(PublicKey.from(frame.feedKey).toHex()) ?? -1), 0),
    0,
  );
};
