//
// Copyright 2024 DXOS.org
//

import { create } from '@bufbuild/protobuf';

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
