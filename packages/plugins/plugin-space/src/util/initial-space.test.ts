//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as TestClock from 'effect/testing/TestClock';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';

import { resolveInitialSpace } from './initial-space';

describe('resolveInitialSpace', () => {
  it.effect('lands on the designated default space', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());

      // Forked mid-genesis, as the app does: the designation is written after the settings space is
      // already listed and open, so nothing but the property write announces it.
      const resolver = yield* Effect.forkChild(resolveInitialSpace(client));
      const { defaultSpace } = yield* AppSpace.setupIdentitySpaces(client);

      expect((yield* Fiber.join(resolver)).id).toBe(defaultSpace.id);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('falls back to the first space the user can see when no default is designated', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());

      // A login that has replicated a space but not the settings space that designates the default.
      const settingsSpace = yield* Effect.promise(() =>
        client.spaces.create({}, { tags: [AppSpace.SETTINGS_SPACE_TAG] }),
      );
      yield* Effect.promise(() => settingsSpace.waitUntilReady());
      const space = yield* Effect.promise(() => client.spaces.create({ name: 'Replicated' }));
      yield* Effect.promise(() => space.waitUntilReady());

      const resolver = yield* Effect.forkChild(resolveInitialSpace(client));
      yield* TestClock.adjust('5 seconds');

      // The settings space is internal; landing on it would show the user app configuration.
      expect((yield* Fiber.join(resolver)).id).toBe(space.id);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('waits for a space rather than resolving to none', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());

      const resolver = yield* Effect.forkChild(resolveInitialSpace(client));
      yield* TestClock.adjust('5 seconds');
      const space = yield* Effect.promise(() => client.spaces.create({ name: 'Late' }));
      yield* Effect.promise(() => space.waitUntilReady());

      expect((yield* Fiber.join(resolver)).id).toBe(space.id);
    }).pipe(Effect.provide(TestLayer)),
  );
});
