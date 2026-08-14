//
// Copyright 2026 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import { describe } from 'vitest';

import { Identity } from '@dxos/halo';
import { PublicKey, SpaceId } from '@dxos/keys';

import { currentOf, makeClientLayer } from './testing';

describe('Identity', () => {
  it.effect(
    'no identity before creation',
    Effect.fn(
      function* ({ expect }) {
        const current = yield* currentOf(Identity.identity);
        expect(Option.isNone(current)).toBe(true);
      },
      Effect.provide(makeClientLayer({ identity: false })),
    ),
  );

  it.effect(
    'creates an identity',
    Effect.fn(
      function* ({ expect }) {
        const info = yield* Identity.create({ displayName: 'test-user' });
        expect(info.displayName).toEqual('test-user');
        expect(info.did).toBeTypeOf('string');

        const current = yield* currentOf(Identity.identity);
        expect(Option.getOrThrow(current).did).toEqual(info.did);

        const devices = yield* currentOf(Identity.devices);
        expect(devices).toHaveLength(1);
        expect(devices[0].current).toBe(true);
      },
      Effect.provide(makeClientLayer({ identity: false })),
    ),
  );

  it.effect(
    'creates an identity with a custom device label',
    Effect.fn(
      function* ({ expect }) {
        yield* Identity.create({ displayName: 'test-user', deviceLabel: 'custom-device' });
        const devices = yield* currentOf(Identity.devices);
        expect(devices).toHaveLength(1);
        expect(devices[0].label).toEqual('custom-device');
      },
      Effect.provide(makeClientLayer({ identity: false })),
    ),
  );

  it.effect(
    'updates the profile',
    Effect.fn(
      function* ({ expect }) {
        yield* Identity.create({ displayName: 'test-user' });
        const updated = yield* Identity.updateProfile({ displayName: 'test-user-updated' });
        expect(updated.displayName).toEqual('test-user-updated');

        const current = yield* currentOf(Identity.identity);
        expect(Option.getOrThrow(current).displayName).toEqual('test-user-updated');
      },
      Effect.provide(makeClientLayer({ identity: false })),
    ),
  );

  it.effect(
    'no personal space id before creation, one after',
    Effect.fn(
      function* ({ expect }) {
        expect(Option.isNone(yield* Identity.personalSpaceId)).toBe(true);

        yield* Identity.create({ displayName: 'test-user' });
        const spaceId = yield* Identity.personalSpaceId;
        expect(SpaceId.isValid(Option.getOrThrow(spaceId))).toBe(true);
      },
      Effect.provide(makeClientLayer({ identity: false })),
    ),
  );

  it.effect(
    'exposes an EDGE identity that signs a presentation over a challenge',
    Effect.fn(function* ({ expect }) {
      const identity = Option.getOrThrow(yield* Identity.getSnapshot);
      const edgeIdentity = Option.getOrThrow(yield* Identity.getEdgeIdentity);
      expect(edgeIdentity.identityDid).toEqual(identity.did);
      const devices = yield* currentOf(Identity.devices);
      expect(edgeIdentity.peerKey).toEqual(devices.find((device) => device.current)?.key);

      // The presentation must carry the challenge, since that is what EDGE verifies it against.
      const challenge = new Uint8Array([1, 2, 3, 4]);
      const presentation = yield* Effect.promise(() => edgeIdentity.presentCredentials({ challenge }));
      expect(presentation.credentials?.length).toBeGreaterThan(0);
      expect(presentation.proofs?.[0].nonce).toEqual(challenge);
    }, Effect.provide(makeClientLayer())),
  );

  it.effect(
    'has no EDGE identity before one exists',
    Effect.fn(
      function* ({ expect }) {
        expect(Option.isNone(yield* Identity.getEdgeIdentity)).toBe(true);
      },
      Effect.provide(makeClientLayer({ identity: false })),
    ),
  );

  it.effect(
    'creates a recovery credential and returns a recovery code',
    Effect.fn(function* ({ expect }) {
      const { recoveryCode } = yield* Identity.createRecoveryCredential();
      expect(recoveryCode).toBeTypeOf('string');
    }, Effect.provide(makeClientLayer())),
  );

  it.effect(
    'registers an external recovery key and revokes it by lookup key',
    Effect.fn(function* ({ expect }) {
      const lookupKey = PublicKey.random().toHex();
      const result = yield* Identity.createRecoveryCredential({
        externalKey: {
          recoveryKey: PublicKey.random().toHex(),
          lookupKey,
          algorithm: 'ED25519',
          label: 'Passkey on Linux',
          kind: 'passkey',
        },
      });
      // No code: the key came from the caller, so there is no seed phrase to hand back.
      expect(result.recoveryCode).toBeUndefined();

      // Client services refuse to revoke the last un-revoked credential, so add a second one.
      yield* Identity.createRecoveryCredential();
      yield* Identity.revokeRecoveryCredential(lookupKey);

      // Revocation resolving only for a registered key is what proves the lookup key round-tripped.
      const unknown = yield* Effect.result(Identity.revokeRecoveryCredential(PublicKey.random().toHex()));
      expect(unknown._tag).toEqual('Failure');
    }, Effect.provide(makeClientLayer())),
  );

  it.effect(
    'the identity stream emits the created identity',
    Effect.fn(
      function* ({ expect }) {
        yield* Identity.create({ displayName: 'streamed' });
        const identity = yield* Identity.identity.pipe(
          Stream.filter(Option.isSome),
          Stream.runHead,
          Effect.map(Option.flatten),
        );
        expect(Option.getOrThrow(identity).displayName).toEqual('streamed');
      },
      Effect.provide(makeClientLayer({ identity: false })),
    ),
  );
});
