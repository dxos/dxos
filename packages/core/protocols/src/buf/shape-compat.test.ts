//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

import { type Invitation } from '../proto/gen/dxos/client/services.ts';
import { type FeedMessage } from '../proto/gen/dxos/echo/feed.ts';
import { type EchoMetadata, type LargeSpaceMetadata, type SpaceMetadata } from '../proto/gen/dxos/echo/metadata.ts';
import { type EchoObject } from '../proto/gen/dxos/echo/object.ts';
import { type Heads } from '../proto/gen/dxos/echo/query.ts';
import { type Claim, type Credential } from '../proto/gen/dxos/halo/credentials.ts';
import { type KeyRecord } from '../proto/gen/dxos/halo/keyring.ts';
import { type Command } from '../proto/gen/dxos/mesh/muxer.ts';
import { schema } from '../proto/index.ts';
import { InvitationSchema } from './proto/gen/dxos/client/invitation_pb.ts';
import { FeedMessageSchema } from './proto/gen/dxos/echo/feed_pb.ts';
import {
  EchoMetadataSchema,
  LargeSpaceMetadataSchema,
  SpaceMetadataSchema,
} from './proto/gen/dxos/echo/metadata_pb.ts';
import { EchoObject_SnapshotSchema } from './proto/gen/dxos/echo/object_pb.ts';
import { HeadsSchema } from './proto/gen/dxos/echo/query_pb.ts';
import { ErrorSchema } from './proto/gen/dxos/error_pb.ts';
import { ClaimSchema, CredentialSchema } from './proto/gen/dxos/halo/credentials_pb.ts';
import { KeyRecordSchema } from './proto/gen/dxos/halo/keyring_pb.ts';
import { CommandSchema } from './proto/gen/dxos/mesh/muxer_pb.ts';
import { AnyEncodingError, decodeCompat, encodeCompat } from './shape-compat.ts';

/** The buf `{ case, value }` oneof group must not leak into the decoded shape. */
type CommandDecoded = Command & { payload?: unknown };

// Byte equality alone would miss a substitution decoding to the wrong JS type, and shape equality
// alone would miss a field-numbering divergence between the two generators, so both are asserted.

describe('buf shape-compat', () => {
  test('a Struct field round-trips as a plain object', ({ expect }) => {
    // `dxos.error.Error` carries the only Struct on the RPC error channel, so a re-encoding
    // regression here empties every service call's error context.
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

  test('EchoMetadata round-trips a populated profile record', ({ expect }) => {
    // `EchoMetadata` is the persisted profile root, so a divergence makes an existing profile
    // unreadable rather than failing a request.
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
    const decoded = decodeCompat<EchoMetadata>(EchoMetadataSchema, legacyBytes);
    invariant(decoded.identity);
    invariant(decoded.spaces);
    invariant(decoded.deletedSpaces);
    invariant(decoded.created);
    invariant(decoded.updated);
    const decodedSpace = decoded.spaces[0];
    invariant(decodedSpace?.dataTimeframe);
    expect(decoded.identity.identityKey.equals(identityKey)).toBe(true);
    expect(decodedSpace.dataTimeframe).toBeInstanceOf(Timeframe);
    expect(decodedSpace.dataTimeframe.get(feedKey)).toBe(12);
    expect(decoded.deletedSpaces.every((key: unknown) => PublicKey.isPublicKey(key))).toBe(true);
    expect(decoded.created.getTime()).toBe(1_700_000_000_000);
    expect(decoded.updated.getTime()).toBe(1_700_000_060_500);

    // The legacy codec must also read what buf wrote, or a downgrade loses the profile. `updated` is
    // asserted in both directions because it is the field the two generators disagree about.
    const legacyDecoded = codec.decode(encodeCompat(EchoMetadataSchema, value));
    expect(legacyDecoded.created?.getTime()).toBe(1_700_000_000_000);
    expect(legacyDecoded.updated?.getTime()).toBe(1_700_000_060_500);
    expect(legacyDecoded.identity?.deviceKey.equals(deviceKey)).toBe(true);
    expect(legacyDecoded.spaces?.[0].dataTimeframe?.get(feedKey)).toBe(12);
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

  test('an Any payload packs and unpacks in the legacy shape', ({ expect }) => {
    const codec = schema.getCodecForType('dxos.halo.credentials.Claim');
    const spaceKey = PublicKey.random();
    const value = {
      id: PublicKey.random(),
      assertion: {
        '@type': 'dxos.halo.credentials.SpaceMember',
        'spaceKey': spaceKey,
        'role': 2,
        'genesisFeedKey': PublicKey.random(),
      },
    };

    const legacyBytes = codec.encode(value);
    expect(new Uint8Array(encodeCompat(ClaimSchema, value))).toEqual(new Uint8Array(legacyBytes));

    // The packed payload's own substituted fields must come back substituted too.
    const decoded = decodeCompat<Claim>(ClaimSchema, legacyBytes);
    expect(decoded.assertion['@type']).toBe('dxos.halo.credentials.SpaceMember');
    expect(PublicKey.from(decoded.assertion.spaceKey).equals(spaceKey)).toBe(true);
    expect(decoded.assertion.spaceKey).toBeInstanceOf(PublicKey);
    // `toMatchObject`, because protobuf.js materialises the unset repeated `tags` as an empty array.
    expect(codec.decode(encodeCompat(ClaimSchema, value)).assertion).toMatchObject(decoded.assertion);
  });

  test('a Credential round-trips byte-identically', ({ expect }) => {
    // The signature payload itself is asserted against the real signing code in
    // `credentials/buf-compat.test.ts`.
    const codec = schema.getCodecForType('dxos.halo.credentials.Credential');
    const value = {
      id: PublicKey.random(),
      issuer: PublicKey.random(),
      issuanceDate: new Date(1700000000123),
      subject: {
        id: PublicKey.random(),
        assertion: {
          '@type': 'dxos.halo.credentials.AuthorizedDevice',
          'identityKey': PublicKey.random(),
          'deviceKey': PublicKey.random(),
        },
      },
      proof: {
        type: 'Ed25519Signature2020',
        creationDate: new Date(1700000000123),
        signer: PublicKey.random(),
        value: new Uint8Array([9, 8, 7]),
      },
    };

    // Sub-second timestamps keep the bytes comparable: protobuf.js writes `nanos: 0` explicitly
    // where buf omits the proto3 default, so a whole-second date diverges by two bytes.
    const legacyBytes = codec.encode(value);
    const bufBytes = encodeCompat(CredentialSchema, value);
    expect(new Uint8Array(bufBytes)).toEqual(new Uint8Array(legacyBytes));

    const decoded = decodeCompat<Credential>(CredentialSchema, legacyBytes);
    expect(decoded.issuanceDate).toBeInstanceOf(Date);
    expect(decoded.issuer).toBeInstanceOf(PublicKey);
    expect(decoded.subject.assertion['@type']).toBe('dxos.halo.credentials.AuthorizedDevice');
    expect(decoded.subject.assertion.deviceKey).toBeInstanceOf(PublicKey);
    expect(codec.decode(bufBytes)).toMatchObject({ proof: { type: 'Ed25519Signature2020' } });
  });

  test('an Any whose type is not in the registry stays packed', ({ expect }) => {
    const value = {
      id: PublicKey.random(),
      assertion: { '@type': 'google.protobuf.Any', 'type_url': 'com.example.Unknown', 'value': new Uint8Array([1]) },
    };

    const decoded = decodeCompat<Claim>(ClaimSchema, encodeCompat(ClaimSchema, value));
    expect(decoded.assertion['@type']).toBe('google.protobuf.Any');
    expect(decoded.assertion.type_url).toBe('com.example.Unknown');
    expect(new Uint8Array(decoded.assertion.value)).toEqual(new Uint8Array([1]));
  });

  test('a preserve_any field leaves its payload packed', ({ expect }) => {
    const codec = schema.getCodecForType('dxos.echo.object.EchoObject.Snapshot');
    const value = {
      model: { '@type': 'google.protobuf.Any', 'type_url': 'com.example.Model', 'value': new Uint8Array([4, 5]) },
    };

    const legacyBytes = codec.encode(value);
    expect(new Uint8Array(encodeCompat(EchoObject_SnapshotSchema, value))).toEqual(new Uint8Array(legacyBytes));

    // The compat layer normalises the packed bytes to a `Uint8Array`, where protobuf.js hands back
    // a `Buffer` view.
    const decoded = decodeCompat<EchoObject.Snapshot>(EchoObject_SnapshotSchema, legacyBytes);
    expect(decoded.model['@type']).toBe('google.protobuf.Any');
    expect(decoded.model.type_url).toBe('com.example.Model');
    expect(new Uint8Array(decoded.model.value)).toEqual(new Uint8Array([4, 5]));
  });

  test('LargeSpaceMetadata carries a credential snapshot across codecs', ({ expect }) => {
    // The metadata store's on-disk record, whose credentials carry a packed `Any`.
    const codec = schema.getCodecForType('dxos.echo.metadata.LargeSpaceMetadata');
    const value = {
      controlPipelineSnapshot: {
        timeframe: new Timeframe([[PublicKey.random(), 4]]),
        messages: [
          {
            feedKey: PublicKey.random(),
            credential: {
              issuer: PublicKey.random(),
              issuanceDate: new Date(1700000000123),
              subject: {
                id: PublicKey.random(),
                assertion: {
                  '@type': 'dxos.halo.credentials.AdmittedFeed',
                  'spaceKey': PublicKey.random(),
                  'identityKey': PublicKey.random(),
                  'deviceKey': PublicKey.random(),
                  'designation': 1,
                },
              },
            },
          },
        ],
      },
    };

    const legacyBytes = codec.encode(value);
    expect(new Uint8Array(encodeCompat(LargeSpaceMetadataSchema, value))).toEqual(new Uint8Array(legacyBytes));

    const decoded = decodeCompat<LargeSpaceMetadata>(LargeSpaceMetadataSchema, legacyBytes);
    invariant(decoded.controlPipelineSnapshot);
    invariant(decoded.controlPipelineSnapshot.messages);
    expect(decoded.controlPipelineSnapshot.timeframe).toBeInstanceOf(Timeframe);
    const message = decoded.controlPipelineSnapshot.messages[0];
    expect(message.feedKey).toBeInstanceOf(PublicKey);
    expect(message.credential.issuanceDate).toBeInstanceOf(Date);
    expect(message.credential.subject.assertion['@type']).toBe('dxos.halo.credentials.AdmittedFeed');
    expect(message.credential.subject.assertion.deviceKey).toBeInstanceOf(PublicKey);
  });

  test('FeedMessage carries a credential across codecs', ({ expect }) => {
    const codec = schema.getCodecForType('dxos.echo.feed.FeedMessage');
    const value = {
      timeframe: new Timeframe([[PublicKey.random(), 1]]),
      payload: {
        credential: {
          credential: {
            issuer: PublicKey.random(),
            issuanceDate: new Date(1700000000123),
            subject: {
              id: PublicKey.random(),
              assertion: { '@type': 'dxos.halo.credentials.SpaceGenesis', 'spaceKey': PublicKey.random() },
            },
          },
        },
      },
    };

    const legacyBytes = codec.encode(value);
    expect(new Uint8Array(encodeCompat(FeedMessageSchema, value))).toEqual(new Uint8Array(legacyBytes));

    // The `payload` oneof must stay flat and its packed credential resolved.
    const decoded = decodeCompat<FeedMessage>(FeedMessageSchema, legacyBytes);
    invariant(decoded.payload?.credential);
    expect(decoded.timeframe).toBeInstanceOf(Timeframe);
    expect(decoded.payload.credential.credential.subject.assertion['@type']).toBe('dxos.halo.credentials.SpaceGenesis');
  });

  test('packing an Any without an @type fails rather than writing an empty payload', ({ expect }) => {
    expect(() => encodeCompat(ClaimSchema, { id: PublicKey.random(), assertion: {} })).toThrow(AnyEncodingError);
  });
});
