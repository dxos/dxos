//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

/**
 * Effect schema for `dxos.keys.PublicKey`, encoded as raw key bytes on the wire.
 */
export const publicKey: Schema.Schema<PublicKey, Uint8Array> = Schema.transform(
  Schema.Uint8ArrayFromSelf,
  Schema.instanceOf(PublicKey),
  {
    strict: true,
    decode: (bytes) => PublicKey.from(bytes),
    encode: (key) => key.asUint8Array(),
  },
);

/**
 * Single entry of a {@link Timeframe} — a feed key paired with its latest sequence number.
 * Mirrors the `dxos.echo.timeframe.TimeframeVector.Frame` proto message.
 */
const TimeframeFrame = Schema.Struct({
  feedKey: publicKey,
  seq: Schema.Number,
});

/**
 * Effect schema for `dxos.echo.timeframe.TimeframeVector`, reconstructing the {@link Timeframe}
 * domain class on decode. The proto codec substitutes this message to `Timeframe`, so the
 * generated `TimeframeVector` interface (a plain `frames` array) does not describe the runtime
 * value; both RPC ends share this schema, so the frame list is carried structurally on the wire.
 */
export const timeframe: Schema.Schema<Timeframe, ReadonlyArray<Schema.Schema.Encoded<typeof TimeframeFrame>>> =
  Schema.transform(Schema.Array(TimeframeFrame), Schema.instanceOf(Timeframe), {
    strict: true,
    decode: (frames) => new Timeframe(frames.map((frame) => [frame.feedKey, frame.seq])),
    encode: (value) => value.frames().map(([feedKey, seq]) => ({ feedKey, seq })),
  });

/**
 * Effect schema for `google.protobuf.Struct`, matching the proto codec substitution shape.
 */
export const protoStruct: Schema.Schema<Record<string, unknown>> = Schema.Record({
  key: Schema.String,
  value: Schema.Unknown,
});

/**
 * Effect schema for `google.protobuf.Timestamp`, matching the proto codec substitution shape.
 */
export const protoTimestamp: Schema.Schema<Date, Date> = Schema.DateFromSelf;
