//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

import { schema } from '../proto/index.ts';
import { SpaceMetadataSchema } from './proto/gen/dxos/echo/metadata_pb.ts';
import { HeadsSchema } from './proto/gen/dxos/echo/query_pb.ts';
import { ClaimSchema } from './proto/gen/dxos/halo/credentials_pb.ts';
import { KeyRecordSchema } from './proto/gen/dxos/halo/keyring_pb.ts';
import { UnsupportedSubstitutionError, decodeCompat, encodeCompat } from './shape-compat.ts';

// Conformance harness for the buf shape-compat layer: for each message, the protobuf.js codec and
// the compat layer must agree on the wire bytes AND on the decoded object shape, in both
// directions. Byte equality alone would miss a substitution that decodes to the wrong JS type,
// and shape equality alone would miss a field-numbering divergence between the two generators.

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

    // The point of the layer: decoding buf bytes yields PublicKey/Timeframe instances, not the
    // plain messages the generated buf types would otherwise hand back.
    const decoded = decodeCompat(SpaceMetadataSchema, legacyBytes);
    expect(PublicKey.isPublicKey(decoded.key)).toBe(true);
    expect(decoded.key.equals(spaceKey)).toBe(true);
    expect(decoded.feedKeys.every((key: unknown) => PublicKey.isPublicKey(key))).toBe(true);
    expect(decoded.dataTimeframe).toBeInstanceOf(Timeframe);
    expect(decoded.dataTimeframe.get(feedKey)).toBe(7);

    // And the legacy codec accepts what the layer produced.
    const legacyDecoded = codec.decode(bufBytes);
    expect(legacyDecoded.key.equals(spaceKey)).toBe(true);
    expect(legacyDecoded.dataTimeframe?.get(feedKey)).toBe(7);
  });

  test('a message carrying google.protobuf.Any is rejected rather than mis-encoded', ({ expect }) => {
    // `Any` needs a buf-side type registry and the `preserve_any` field option; until that lands,
    // failing loudly is the only safe behaviour for persisted or signed data.
    expect(() => encodeCompat(ClaimSchema, { id: PublicKey.random(), assertion: {} })).toThrow(
      UnsupportedSubstitutionError,
    );
  });
});
