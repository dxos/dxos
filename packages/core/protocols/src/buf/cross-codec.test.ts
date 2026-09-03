//
// Copyright 2026 DXOS.org
//

import { type DescField, type DescMessage, create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { describe, expect, test } from 'vitest';

import { schema } from '../proto/index.ts';
import { bufRegistry } from './registry.ts';
import { decodeCompat, encodeCompat } from './shape-compat.ts';

// Cross-codec agreement, checked against the current tree because both codecs are in the workspace.
//
// WHAT THIS IS NOT. Both sides regenerate from the same `src/proto` tree, so a wire-incompatible
// edit to a `.proto` moves them together and passes here unnoticed. This is *not* a downgrade or
// compatibility guard and must not be cited as one — catching that needs bytes from a build
// predating the edit (see `docs/audits/protobufjs-to-buf.md` for the rejected historical pin).
// What it does give is continuous agreement between the two codecs on every CI run.
//
// This guard exists only while both codecs do, and is deleted with protobuf.js at teardown.

const ANY_PAYLOAD_TYPE = 'dxos.echo.query.Heads';

/** Distinctive per-field values: an all-defaults message survives almost any encoding bug. */
const scalarFor = (field: DescField, salt: number): unknown => {
  switch (field.scalar) {
    case 1:
    case 2:
      return 1.5 + salt;
    case 3:
    case 4:
    case 6:
    case 16:
    case 18:
      return BigInt(1000 + salt);
    case 8:
      return true;
    case 9:
      return `value-${salt}`;
    case 12:
      return new Uint8Array(Array.from({ length: 32 }, (_, index) => (salt + index) & 0xff));
    default:
      return 100 + salt;
  }
};

/** Builds a message with every field populated, so the round-trip exercises real encodings. */
const populate = (desc: DescMessage, depth = 0): Record<string, unknown> | undefined => {
  // Substituted for classes that reject an empty value, so always filled.
  if (desc.typeName === 'dxos.keys.PublicKey' || desc.typeName === 'dxos.keys.PrivateKey') {
    return { data: new Uint8Array(Array.from({ length: 32 }, (_, index) => (index * 7 + 1) & 0xff)) };
  }
  // `Timestamp` is substituted for `Date`, which is millisecond-resolution. Sub-millisecond `nanos`
  // cannot survive that round-trip, so only representable values are generated — see the audit doc,
  // where the lossiness is recorded as a divergence in its own right precisely because this guard
  // deliberately stops exercising it.
  if (desc.typeName === 'google.protobuf.Timestamp') {
    return { seconds: BigInt(1700000000 + depth), nanos: 123_000_000 };
  }
  if (depth > 3) {
    return undefined;
  }

  const init: Record<string, unknown> = {};
  let salt = 0;

  const messageValue = (message: DescMessage): unknown => {
    if (message.typeName === 'google.protobuf.Any') {
      const payload = bufRegistry.getMessage(ANY_PAYLOAD_TYPE);
      return payload === undefined
        ? undefined
        : { typeUrl: ANY_PAYLOAD_TYPE, value: toBinary(payload, create(payload, { hashes: ['any-payload'] })) };
    }
    return populate(message, depth + 1);
  };

  const lastEnumValue = (field: DescField & { enum: { values: { number: number }[] } }): number =>
    field.enum.values[field.enum.values.length - 1]?.number ?? 0;

  const valueFor = (field: DescField): unknown => {
    salt += 1;
    switch (field.fieldKind) {
      case 'scalar':
        return scalarFor(field, salt);
      case 'enum':
        return lastEnumValue(field);
      case 'message':
        return messageValue(field.message);
      // Repeated fields are their own kind in buf's descriptors, not a flag on the others — they
      // were silently skipped until `moon build` rejected the `field.repeated` this replaced.
      case 'list': {
        switch (field.listKind) {
          case 'scalar':
            return [scalarFor(field, salt)];
          case 'enum':
            return [lastEnumValue(field)];
          case 'message': {
            const element = messageValue(field.message);
            return element === undefined ? undefined : [element];
          }
          default:
            return undefined;
        }
      }
      default:
        return undefined;
    }
  };

  for (const field of desc.fields) {
    if (field.fieldKind === 'map') {
      continue;
    }
    const value = valueFor(field);
    if (value === undefined) {
      continue;
    }
    if (field.oneof) {
      if (init[field.oneof.localName] === undefined) {
        init[field.oneof.localName] = { case: field.localName, value };
      }
      continue;
    }
    init[field.localName] = value;
  }
  // An empty nested message is worse than an absent one: protobuf.js materialises absent
  // submessages with unsubstituted defaults, which is divergence 1 below.
  return Object.keys(init).length > 0 ? init : undefined;
};

/**
 * Compares byte content rather than view class.
 *
 * protobuf.js returns Node `Buffer`s for bytes fields where buf returns `Uint8Array`. The
 * distinction is not observable on the wire and cannot reach a signature — `canonicalStringify`
 * normalises both to hex — so it is not treated as a divergence.
 */
const byBytes = (value: unknown): unknown => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Uint8Array) {
    return Array.from(value);
  }
  if (value instanceof Date) {
    return { $date: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return value.map(byBytes);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, byBytes(entry)]));
  }
  return value;
};

/** Field paths at which two decoded shapes disagree, so a divergence is keyed on where it happens. */
const divergingPaths = (left: unknown, right: unknown, path = ''): string[] => {
  if (JSON.stringify(byBytes(left)) === JSON.stringify(byBytes(right))) {
    return [];
  }
  const bothObjects =
    left !== null &&
    right !== null &&
    typeof left === 'object' &&
    typeof right === 'object' &&
    !Array.isArray(left) &&
    !Array.isArray(right);
  if (!bothObjects) {
    return [path || '.'];
  }
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].flatMap((key) =>
    divergingPaths(
      (left as Record<string, unknown>)[key],
      (right as Record<string, unknown>)[key],
      path ? `${path}.${key}` : key,
    ),
  );
};

const outcomeOf = (run: () => string[]): { paths: string[]; error?: string } => {
  try {
    return { paths: run() };
  } catch (err) {
    return { paths: [], error: err instanceof Error ? err.message : String(err) };
  }
};

type LegacyCodec = {
  encode(value: unknown): Uint8Array;
  decode(bytes: Uint8Array): unknown;
};

/**
 * `getCodecForType` is keyed on the protobuf.js type union, which a registry walk cannot narrow to,
 * so the codec is taken at the surface this file uses. Method syntax keeps the parameters bivariant
 * and the assignment honest, matching `Substitution` in `shape-compat.ts`.
 */
const legacyCodec = (typeName: string): LegacyCodec => schema.getCodecForType(typeName as never);

const knownToLegacy = (typeName: string): boolean => {
  try {
    legacyCodec(typeName);
    return true;
  } catch {
    return false;
  }
};

const covered = [...bufRegistry]
  .filter((desc): desc is DescMessage => desc.kind === 'message')
  .filter((desc) => knownToLegacy(desc.typeName));

/**
 * Divergences between the two codecs, keyed on the message **and the exact field paths** at which
 * they disagree — not on the message alone. A message listed here still fails if it diverges
 * somewhere new, so this is a ledger rather than a mute button.
 *
 * All nineteen share one root cause: protobuf.js's decoder materialises an *absent* singular
 * message field with unsubstituted defaults (`issuer: {data:{}}`, a bare `{seconds,nanos}` where a
 * `Date` is expected), where the compat layer leaves it absent. It is the legacy codec's own
 * asymmetry — its encoder then rejects what its decoder produced — and predates this migration.
 * Entries are expected to disappear as messages move to buf, never to be added.
 */
const KNOWN_DIVERGENCES: { typeName: string; decode: string[]; encode: string[] }[] = [
  {
    typeName: 'dxos.client.services.ContactBook',
    decode: ['contacts'],
    encode: [],
  },
  {
    typeName: 'dxos.client.services.JoinSpaceResponse',
    decode: ['space.members', 'space.pipeline.appliedEpoch.subject', 'space.pipeline.currentEpoch.subject'],
    encode: ['space.pipeline.appliedEpoch.subject', 'space.pipeline.currentEpoch.subject'],
  },
  {
    typeName: 'dxos.client.services.LoadPersistentInvitationsResponse',
    decode: ['invitations'],
    encode: [],
  },
  {
    typeName: 'dxos.client.services.NetworkStatus',
    decode: ['connectionInfo'],
    encode: [],
  },
  {
    typeName: 'dxos.client.services.QueryInvitationsResponse',
    decode: ['invitations'],
    encode: [],
  },
  {
    typeName: 'dxos.client.services.QuerySpacesResponse',
    decode: ['spaces'],
    encode: ['spaces'],
  },
  {
    typeName: 'dxos.client.services.Space',
    decode: ['members'],
    encode: [],
  },
  {
    typeName: 'dxos.config.Config',
    decode: ['package.modules'],
    encode: [],
  },
  {
    typeName: 'dxos.config.Module',
    decode: ['deps'],
    encode: [],
  },
  {
    typeName: 'dxos.config.Package',
    decode: ['modules'],
    encode: [],
  },
  {
    typeName: 'dxos.devtools.host.SubscribeToFeedBlocksResponse',
    decode: ['blocks'],
    encode: ['blocks'],
  },
  {
    typeName: 'dxos.devtools.host.SubscribeToFeedBlocksResponse.Block',
    decode: ['data.payload'],
    encode: ['data.payload'],
  },
  {
    typeName: 'dxos.devtools.host.SubscribeToMetadataResponse',
    decode: ['metadata.invitations', 'metadata.spaces'],
    encode: [],
  },
  {
    typeName: 'dxos.devtools.host.SubscribeToSpacesResponse',
    decode: ['spaces'],
    encode: [],
  },
  {
    typeName: 'dxos.devtools.swarm.ConnectionInfo',
    decode: ['streams'],
    encode: [],
  },
  {
    typeName: 'dxos.devtools.swarm.SwarmInfo',
    decode: ['connections'],
    encode: [],
  },
  {
    typeName: 'dxos.echo.feed.FeedMessage',
    decode: ['payload.credential.credential.subject'],
    encode: ['payload.payload.value.credential.subject'],
  },
  {
    typeName: 'dxos.echo.metadata.ControlPipelineSnapshot',
    decode: ['messages'],
    encode: [],
  },
  {
    typeName: 'dxos.echo.metadata.EchoMetadata',
    decode: ['invitations', 'spaces'],
    encode: [],
  },
  {
    typeName: 'dxos.echo.metadata.LargeSpaceMetadata',
    decode: ['controlPipelineSnapshot.messages'],
    encode: ['controlPipelineSnapshot.messages'],
  },
  {
    typeName: 'dxos.echo.object.EchoObject',
    decode: [
      'mutations',
      'snapshot.model.@type',
      'snapshot.model.hashes',
      'snapshot.model.type_url',
      'snapshot.model.value',
    ],
    encode: [],
  },
  {
    typeName: 'dxos.echo.object.EchoObject.Mutation',
    decode: ['model.@type', 'model.hashes', 'model.type_url', 'model.value'],
    encode: [],
  },
  {
    typeName: 'dxos.echo.object.EchoObject.Snapshot',
    decode: ['model.@type', 'model.hashes', 'model.type_url', 'model.value'],
    encode: [],
  },
  {
    typeName: 'dxos.echo.query.QueryResponse',
    decode: ['objects', 'results'],
    encode: [],
  },
  {
    typeName: 'dxos.echo.snapshot.EchoSnapshot',
    decode: ['items'],
    encode: [],
  },
  {
    typeName: 'dxos.echo.snapshot.SpaceSnapshot',
    decode: ['database.items'],
    encode: [],
  },
  {
    typeName: 'dxos.edge.calls.Activity',
    decode: ['payload'],
    encode: ['payload'],
  },
  {
    typeName: 'dxos.edge.calls.UserState',
    decode: ['activities'],
    encode: [],
  },
  {
    typeName: 'dxos.edge.messenger.Message',
    decode: ['target'],
    encode: [],
  },
  {
    typeName: 'dxos.edge.messenger.SwarmResponse',
    decode: ['inactivePeers', 'peers'],
    encode: [],
  },
  {
    typeName: 'dxos.halo.credentials.Credential',
    decode: ['proof.chain.credential.subject'],
    encode: ['proof.chain.credential.subject'],
  },
  {
    typeName: 'dxos.halo.credentials.Presentation',
    decode: ['credentials', 'proofs'],
    encode: ['proofs'],
  },
  {
    typeName: 'dxos.halo.signed.KeyChain',
    decode: ['message.signatures', 'parents'],
    encode: ['message.signatures', 'parents'],
  },
  {
    typeName: 'dxos.halo.signed.SignedMessage',
    decode: ['signatures'],
    encode: ['signatures'],
  },
  {
    typeName: 'dxos.halo.signed.SignedMessage.Signature',
    decode: ['keyChain.message.signatures', 'keyChain.parents'],
    encode: ['keyChain.parents'],
  },
  {
    typeName: 'dxos.mesh.bridge.BridgeEvent.SignalEvent',
    decode: ['payload'],
    encode: ['payload'],
  },
  {
    typeName: 'dxos.mesh.bridge.SignalRequest',
    decode: ['signal'],
    encode: ['signal'],
  },
  {
    typeName: 'dxos.mesh.bridge.StatsResponse',
    decode: ['stats'],
    encode: ['stats'],
  },
  {
    typeName: 'dxos.mesh.swarm.Signal',
    decode: ['payload'],
    encode: ['payload'],
  },
  {
    typeName: 'dxos.mesh.teleport.notarization.NotarizeRequest',
    decode: ['credentials'],
    encode: [],
  },
  {
    typeName: 'dxos.mesh.teleport.replicator.UpdateFeedsRequest',
    decode: ['feeds'],
    encode: [],
  },
  {
    typeName: 'dxos.service.agentmanager.Authentication',
    decode: ['presentation.credentials', 'presentation.proofs'],
    encode: [],
  },
];

const divergenceFor = (typeName: string) => KNOWN_DIVERGENCES.find((entry) => entry.typeName === typeName);

describe('cross-codec agreement (current tree)', () => {
  test('the registry is actually being walked', () => {
    // Guards against a filter silently reducing the cases below to nothing while still reporting
    // green.
    expect(covered.length).toBeGreaterThan(100);
  });

  test('the divergence ledger does not grow, and holds no stale entries', () => {
    expect(KNOWN_DIVERGENCES.length).toBe(42);
    // A ledger entry for a message that no longer diverges is as much a defect as a missing one:
    // it would silence a future regression on a message that is currently clean.
    const names = new Set(covered.map((desc) => desc.typeName));
    expect(KNOWN_DIVERGENCES.filter((entry) => !names.has(entry.typeName))).toEqual([]);
  });

  for (const desc of covered) {
    const known = divergenceFor(desc.typeName);

    // The guarantee the migration rests on: reading the same bytes with either decoder yields the
    // same substituted shape, so a call site cannot tell which codec carried its value.
    test(`${desc.typeName}: both decoders agree on the same bytes`, () => {
      const bytes = toBinary(desc, create(desc, populate(desc)));
      const observed = outcomeOf(() =>
        divergingPaths(decodeCompat(desc, bytes), legacyCodec(desc.typeName).decode(bytes)),
      );
      expect(observed.error).toBeUndefined();
      expect(observed.paths.sort()).toEqual(known?.decode ?? []);
    });

    // And the encoders: a value in the substituted shape must reach the wire identically whichever
    // side writes it, which is what makes swapping a codec at a call site safe.
    test(`${desc.typeName}: both encoders agree on the same value`, () => {
      const bytes = toBinary(desc, create(desc, populate(desc)));
      const observed = outcomeOf(() => {
        const substituted = decodeCompat(desc, bytes);
        return divergingPaths(
          fromBinary(desc, encodeCompat(desc, substituted)),
          fromBinary(desc, legacyCodec(desc.typeName).encode(substituted)),
        );
      });
      expect(observed.error).toBeUndefined();
      expect(observed.paths.sort()).toEqual(known?.encode ?? []);
    });
  }
});
