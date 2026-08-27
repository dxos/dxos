//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

import { type Invitation } from '../proto/gen/dxos/client/services.ts';
import { type SpaceMetadata } from '../proto/gen/dxos/echo/metadata.ts';
import { type Heads } from '../proto/gen/dxos/echo/query.ts';
import { type KeyRecord } from '../proto/gen/dxos/halo/keyring.ts';
import { type Command } from '../proto/gen/dxos/mesh/muxer.ts';
import { schema } from '../proto/index.ts';
import { InvitationSchema } from './proto/gen/dxos/client/invitation_pb.ts';
import { SpaceMetadataSchema } from './proto/gen/dxos/echo/metadata_pb.ts';
import { HeadsSchema } from './proto/gen/dxos/echo/query_pb.ts';
import { ClaimSchema } from './proto/gen/dxos/halo/credentials_pb.ts';
import { KeyRecordSchema } from './proto/gen/dxos/halo/keyring_pb.ts';
import { CommandSchema } from './proto/gen/dxos/mesh/muxer_pb.ts';
import { UnsupportedSubstitutionError, decodeCompat, encodeCompat } from './shape-compat.ts';

/** The buf `{ case, value }` oneof group must not leak into the decoded shape. */
type CommandDecoded = Command & { payload?: unknown };

// Byte equality alone would miss a substitution decoding to the wrong JS type, and shape equality
// alone would miss a field-numbering divergence between the two generators, so both are asserted.

describe('buf shape-compat', () => {
  test('KeyRecord round-trips identically (no substituted fields)', ({ expect }) => {
    const codec = schema.getCodecForType('dxos.halo.keyring.KeyRecord');
    const value = {
      publicKey: new Uint8Array([1, 2, 3, 4]),
      privateKey: new Uint8Array([5, 6, 7, 8]),
    };

    const legacyBytes = codec.encode(value);
    const bufBytes = encodeCompat(KeyRecordSchema, value);
    expect(new Uint8Array(bufBytes)).toEqual(new Uint8Array(legacyBytes));

    expect(decodeCompat<KeyRecord>(KeyRecordSchema, legacyBytes)).toMatchObject(value);
    expect(codec.decode(bufBytes)).toMatchObject(value);
  });

  test('Heads round-trips identically (no substituted fields)', ({ expect }) => {
    const codec = schema.getCodecForType('dxos.echo.query.Heads');
    const value = { hashes: ['aaa', 'bbb'] };

    const legacyBytes = codec.encode(value);
    const bufBytes = encodeCompat(HeadsSchema, value);
    expect(new Uint8Array(bufBytes)).toEqual(new Uint8Array(legacyBytes));

    expect(decodeCompat<Heads>(HeadsSchema, legacyBytes).hashes).toEqual(value.hashes);
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

    const decoded = decodeCompat<SpaceMetadata>(SpaceMetadataSchema, legacyBytes);
    expect(PublicKey.isPublicKey(decoded.key)).toBe(true);
    expect(decoded.key.equals(spaceKey)).toBe(true);
    expect(decoded.feedKeys?.every((key: unknown) => PublicKey.isPublicKey(key))).toBe(true);
    expect(decoded.dataTimeframe).toBeInstanceOf(Timeframe);
    expect(decoded.dataTimeframe?.get(feedKey)).toBe(7);

    const legacyDecoded = codec.decode(bufBytes);
    expect(legacyDecoded.key.equals(spaceKey)).toBe(true);
    expect(legacyDecoded.dataTimeframe?.get(feedKey)).toBe(7);
  });

  test('a pre-epoch Timestamp keeps nanos in proto range', ({ expect }) => {
    // protobuf.js emits negative nanos before the epoch and decodes a second early; the layer
    // canonicalises instead, so this case deliberately diverges from the legacy codec.
    const decoded = decodeCompat<Invitation>(
      InvitationSchema,
      encodeCompat(InvitationSchema, { created: new Date(-1) }),
    );
    expect(decoded.created?.getTime()).toBe(-1);
  });

  test('a selected oneof member round-trips as a flat field', ({ expect }) => {
    const codec = schema.getCodecForType('dxos.mesh.muxer.Command');
    const value = { data: { channelId: 7, data: new Uint8Array([1, 2]) } };

    const legacyBytes = codec.encode(value);
    const bufBytes = encodeCompat(CommandSchema, value);
    expect(new Uint8Array(bufBytes)).toEqual(new Uint8Array(legacyBytes));

    const decoded = decodeCompat<CommandDecoded>(CommandSchema, legacyBytes);
    expect(decoded.payload).toBeUndefined();
    expect(decoded.data?.channelId).toBe(7);
    expect(codec.decode(bufBytes).data?.channelId).toBe(7);
  });

  test('an unset oneof stays absent', ({ expect }) => {
    const decoded = decodeCompat<CommandDecoded>(CommandSchema, encodeCompat(CommandSchema, {}));
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
