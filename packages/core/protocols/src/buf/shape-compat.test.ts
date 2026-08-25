//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

import { schema } from '../proto/index.ts';
import { InvitationSchema } from './proto/gen/dxos/client/invitation_pb.ts';
import { EchoMetadataSchema, SpaceMetadataSchema } from './proto/gen/dxos/echo/metadata_pb.ts';
import { HeadsSchema } from './proto/gen/dxos/echo/query_pb.ts';
import { ErrorSchema } from './proto/gen/dxos/error_pb.ts';
import { ClaimSchema } from './proto/gen/dxos/halo/credentials_pb.ts';
import { KeyRecordSchema } from './proto/gen/dxos/halo/keyring_pb.ts';
import { CommandSchema } from './proto/gen/dxos/mesh/muxer_pb.ts';
import { UnsupportedSubstitutionError, decodeCompat, encodeCompat } from './shape-compat.ts';

// Byte equality alone would miss a substitution decoding to the wrong JS type, and shape equality
// alone would miss a field-numbering divergence between the two generators, so both are asserted.

describe('buf shape-compat', () => {
  test('a Struct field round-trips as a plain object', ({ expect }) => {
    // `protoc-gen-es` types a Struct field as `JsonObject`, so re-encoding it here produced a Struct
    // keyed `fields` -- 105 bytes against the legacy 43, and legacy bytes decoding to `{}`.
    // `dxos.error.Error` carries the only Struct on the RPC error channel, so this covers every
    // service call's error context.
    const codec = schema.getCodecForType('dxos.error.Error');
    const value = {
      name: 'TestError',
      message: 'failed',
      context: { attempt: 2, nested: { ok: true }, list: [1, 'a'] },
    };

    const legacyBytes = codec.encode(value);
    expect(new Uint8Array(encodeCompat(ErrorSchema, value))).toEqual(new Uint8Array(legacyBytes));
    expect(decodeCompat(ErrorSchema, legacyBytes)).toMatchObject(value);
  });

  test('KeyRecord round-trips identically (no substituted fields)', ({ expect }) => {
    const codec = schema.getCodecForType('dxos.halo.keyring.KeyRecord');
    const value = {
      publicKey: new Uint8Array([1, 2, 3, 4]),
      privateKey: new Uint8Array([5, 6, 7, 8]),
    };

    const legacyBytes = codec.encode(value);
    const bufBytes = encodeCompat(KeyRecordSchema, value);
    expect(new Uint8Array(bufBytes)).toEqual(new Uint8Array(legacyBytes));

    expect(decodeCompat(KeyRecordSchema, legacyBytes)).toMatchObject(value);
    expect(codec.decode(bufBytes)).toMatchObject(value);
  });

  test('Heads round-trips identically (no substituted fields)', ({ expect }) => {
    const codec = schema.getCodecForType('dxos.echo.query.Heads');
    const value = { hashes: ['aaa', 'bbb'] };

    const legacyBytes = codec.encode(value);
    const bufBytes = encodeCompat(HeadsSchema, value);
    expect(new Uint8Array(bufBytes)).toEqual(new Uint8Array(legacyBytes));

    expect(decodeCompat(HeadsSchema, legacyBytes).hashes).toEqual(value.hashes);
    expect(codec.decode(bufBytes).hashes).toEqual(value.hashes);
  });

  test('SpaceMetadata preserves PublicKey and Timeframe shapes', ({ expect }) => {
    const codec = schema.getCodecForType('dxos.echo.metadata.SpaceMetadata');
    const spaceKey = PublicKey.random();
    const feedKey = PublicKey.random();
    const value = {
      key: spaceKey,
      tags: ['a'],
      feedKeys: [feedKey],
      genesisFeedKey: feedKey,
      dataTimeframe: new Timeframe([[feedKey, 7]]),
    };

    const legacyBytes = codec.encode(value);
    const bufBytes = encodeCompat(SpaceMetadataSchema, value);
    expect(new Uint8Array(bufBytes)).toEqual(new Uint8Array(legacyBytes));

    const decoded = decodeCompat(SpaceMetadataSchema, legacyBytes);
    expect(PublicKey.isPublicKey(decoded.key)).toBe(true);
    expect(decoded.key.equals(spaceKey)).toBe(true);
    expect(decoded.feedKeys.every((key: unknown) => PublicKey.isPublicKey(key))).toBe(true);
    expect(decoded.dataTimeframe).toBeInstanceOf(Timeframe);
    expect(decoded.dataTimeframe.get(feedKey)).toBe(7);

    const legacyDecoded = codec.decode(bufBytes);
    expect(legacyDecoded.key.equals(spaceKey)).toBe(true);
    expect(legacyDecoded.dataTimeframe?.get(feedKey)).toBe(7);
  });

  test('EchoMetadata round-trips a populated profile record', ({ expect }) => {
    // `#9c`'s fixture: `EchoMetadata` is the persisted profile root, so a divergence here makes an
    // existing profile unreadable rather than failing a request. Populated across every substitution
    // it carries -- `PublicKey` (scalar and repeated), `Timestamp`, `Timeframe` -- plus a nested
    // record and a repeated message, since an empty value would pass on almost any implementation.
    const codec = schema.getCodecForType('dxos.echo.metadata.EchoMetadata');
    const identityKey = PublicKey.random();
    const deviceKey = PublicKey.random();
    const spaceKey = PublicKey.random();
    const feedKey = PublicKey.random();
    const value = {
      version: 3,
      created: new Date(1_700_000_000_000),
      updated: new Date(1_700_000_060_500),
      identity: {
        identityKey,
        deviceKey,
        haloSpace: { key: spaceKey, tags: ['halo'], genesisFeedKey: feedKey },
      },
      spaces: [{ key: spaceKey, tags: ['a', 'b'], dataTimeframe: new Timeframe([[feedKey, 12]]) }],
      deletedSpaces: [PublicKey.random(), PublicKey.random()],
    };

    // Byte equality does NOT hold for this message, and deliberately is not asserted: protobuf.js
    // materialises the unset non-optional `updated` field as an empty `Timestamp` and writes
    // `nanos: 0` explicitly, where buf omits both as proto3 defaults (18 bytes vs 10 on a minimal
    // record). The two remain wire-compatible, which is what a persisted profile needs, so this
    // asserts that both codecs read each other rather than that they agree byte-for-byte.
    const legacyBytes = codec.encode(value);
    const decoded = decodeCompat(EchoMetadataSchema, legacyBytes);
    expect(decoded.identity.identityKey.equals(identityKey)).toBe(true);
    expect(decoded.spaces[0].dataTimeframe).toBeInstanceOf(Timeframe);
    expect(decoded.spaces[0].dataTimeframe.get(feedKey)).toBe(12);
    expect(decoded.deletedSpaces.every((key: unknown) => PublicKey.isPublicKey(key))).toBe(true);
    expect(decoded.created.getTime()).toBe(1_700_000_000_000);

    // The legacy codec must also read what buf wrote, or a downgrade loses the profile.
    const legacyDecoded = codec.decode(encodeCompat(EchoMetadataSchema, value));
    expect(legacyDecoded.identity?.deviceKey.equals(deviceKey)).toBe(true);
    expect(legacyDecoded.spaces?.[0].dataTimeframe?.get(feedKey)).toBe(12);
  });

  test('a pre-epoch Timestamp keeps nanos in proto range', ({ expect }) => {
    // protobuf.js emits negative nanos before the epoch and decodes a second early; the layer
    // canonicalises instead, so this case deliberately diverges from the legacy codec.
    const decoded = decodeCompat(InvitationSchema, encodeCompat(InvitationSchema, { created: new Date(-1) }));
    expect(decoded.created.getTime()).toBe(-1);
  });

  test('a selected oneof member round-trips as a flat field', ({ expect }) => {
    const codec = schema.getCodecForType('dxos.mesh.muxer.Command');
    const value = { data: { channelId: 7, data: new Uint8Array([1, 2]) } };

    const legacyBytes = codec.encode(value);
    const bufBytes = encodeCompat(CommandSchema, value);
    expect(new Uint8Array(bufBytes)).toEqual(new Uint8Array(legacyBytes));

    // The buf `{ case, value }` group must not leak into the decoded shape.
    const decoded = decodeCompat(CommandSchema, legacyBytes);
    expect(decoded.payload).toBeUndefined();
    expect(decoded.data.channelId).toBe(7);
    expect(codec.decode(bufBytes).data?.channelId).toBe(7);
  });

  test('an unset oneof stays absent', ({ expect }) => {
    const decoded = decodeCompat(CommandSchema, encodeCompat(CommandSchema, {}));
    expect(decoded.payload).toBeUndefined();
    expect(decoded.data).toBeUndefined();
  });

  test('a message carrying google.protobuf.Any is rejected rather than mis-encoded', ({ expect }) => {
    // Resolving `Any` needs a buf-side type registry and the `preserve_any` field option.
    expect(() => encodeCompat(ClaimSchema, { id: PublicKey.random(), assertion: {} })).toThrow(
      UnsupportedSubstitutionError,
    );
  });
});
