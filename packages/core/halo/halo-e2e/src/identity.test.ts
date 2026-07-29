//
// Copyright 2026 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import { describe } from 'vitest';

import { Identity } from '@dxos/halo';

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
