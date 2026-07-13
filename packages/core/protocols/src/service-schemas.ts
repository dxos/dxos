//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { PublicKey } from '@dxos/keys';

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

/**
 * Mutable array schema for `repeated` proto fields.
 *
 * `Schema.Array` decodes to a `ReadonlyArray`, which is not assignable to the
 * mutable `T[]` that generated protobuf request/response interfaces expose. Service
 * handlers keep those proto types (see service-rpc-schemas.md), so inline RPC payloads
 * use mutable arrays to stay structurally compatible at the RPC boundary. The wire
 * encoding is identical — only the TypeScript element mutability differs.
 */
export const mutableArray = <Value extends Schema.Schema.Any>(value: Value) => Schema.mutable(Schema.Array(value));
