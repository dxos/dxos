//
// Copyright 2024 DXOS.org
//

import { type Message, create } from '@bufbuild/protobuf';
import { type Timestamp, TimestampSchema } from '@bufbuild/protobuf/wkt';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

import { type TimeframeVector, TimeframeVectorSchema } from './proto/gen/dxos/echo/timeframe_pb.ts';
import { type PublicKey as BufPublicKey, PublicKeySchema } from './proto/gen/dxos/keys_pb.ts';

export * as buf from '@bufbuild/protobuf';
export * as bufWkt from '@bufbuild/protobuf/wkt';

export { create as createBuf } from '@bufbuild/protobuf';

/**
 * Reads `dxos.keys.PublicKey` as the domain key type.
 *
 * buf generates the key as an ordinary message where protobuf.js substituted the `PublicKey`
 * class, so buf-native code converts explicitly. This is the direction of travel — not a compat
 * shim — and it is shared so the substitution is spelled one way everywhere.
 */
export const toPublicKey = (key: BufPublicKey | undefined): PublicKey | undefined => key && PublicKey.from(key.data);

/**
 * Reads a `dxos.keys.PublicKey` the domain treats as required.
 *
 * proto3 makes every message field optional, so a key the schema guarantees still reads as
 * possibly-undefined; asserting it here keeps call sites free of non-null assertions.
 */
export const requirePublicKey = (key: BufPublicKey | undefined): PublicKey => {
  invariant(key, 'Missing public key.');
  return PublicKey.from(key.data);
};

/** Writes the domain key type as `dxos.keys.PublicKey`. */
export const fromPublicKey = (key: PublicKey): BufPublicKey => create(PublicKeySchema, { data: key.asUint8Array() });

/**
 * Reads `dxos.echo.timeframe.TimeframeVector` as the domain type.
 *
 * `Timeframe` carries the behaviour callers need (`merge`, `totalMessages`, `newMessages`); the
 * generated message is its wire form and has none of it. Converting at the boundary keeps the
 * domain class as the domain type rather than teaching the message to behave like one. Mirrors the
 * substitution in `shape-compat.ts` so the two agree.
 */
export const toTimeframe = (vector: TimeframeVector | undefined): Timeframe =>
  new Timeframe((vector?.frames ?? []).map((frame) => [PublicKey.from(frame.feedKey), frame.seq]));

/** Writes the domain type as `dxos.echo.timeframe.TimeframeVector`. */
export const fromTimeframe = (timeframe: Timeframe): TimeframeVector =>
  create(TimeframeVectorSchema, {
    frames: timeframe.frames().map(([feedKey, seq]) => ({ feedKey: feedKey.asUint8Array(), seq })),
  });

/**
 * Reads `google.protobuf.Timestamp` as a `Date`.
 *
 * protobuf.js substituted the timestamp for a `Date`; buf carries the message, whose `seconds` is a
 * BigInt. Converting at the boundary keeps `Date` the domain type — and keeps a message out of
 * `JSON.stringify`, which throws on the BigInt.
 */
export const toDate = (timestamp: Timestamp | undefined): Date | undefined =>
  timestamp && new Date(Number(timestamp.seconds) * 1000 + timestamp.nanos / 1e6);

/**
 * Writes a `Date` as `google.protobuf.Timestamp`.
 *
 * Nanos are derived from the floored-seconds boundary so they stay in proto's required [0, 1e9)
 * range before the epoch, matching the substitution the signing shape reproduces.
 */
export const fromDate = (date: Date): Timestamp => {
  const unixMilliseconds = date.getTime();
  const seconds = Math.floor(unixMilliseconds / 1000);
  return create(TimestampSchema, {
    seconds: BigInt(seconds),
    nanos: (unixMilliseconds - seconds * 1000) * 1e6,
  });
};

/**
 * Drops the message brand so a partial buf message can seed `create`.
 *
 * `Partial<T>` of a generated message carries `$typeName` as optional, which `MessageInit` refuses;
 * the fields themselves are what a caller means by a partial message.
 */
export const bufInit = <T extends Message>({
  $typeName,
  $unknown,
  ...fields
}: Partial<T>): Omit<Partial<T>, '$typeName' | '$unknown'> => fields;
