//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';
import { SpaceState } from '@dxos/client/echo';

import { ensureSettingsSpace } from './settings-space';

describe('ensureSettingsSpace', () => {
  it.effect('discards the settings space it created when another client already made one', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());

      // The settings space another client created, already designating a space — that designation is
      // what makes it canonical, so the tie-break does not depend on how the two ids happen to sort.
      const canonical = yield* Effect.promise(() => client.spaces.create({}, { tags: [AppSpace.SETTINGS_SPACE_TAG] }));
      yield* Effect.promise(() => canonical.waitUntilReady());
      const target = yield* Effect.promise(() => client.spaces.create({ name: 'Target' }));
      yield* Effect.promise(() => target.waitUntilReady());
      AppSpace.setDefaultSpaceId(canonical, target.id);

      // Hidden until this client creates its own: the race is that the lookup misses a settings space
      // that already exists, which is the only way a profile ends up with two.
      let hidden = true;
      const host = {
        spaces: {
          get: () => client.spaces.get().filter((space) => !hidden || space.id !== canonical.id),
          create: (...args: Parameters<typeof client.spaces.create>) => {
            hidden = false;
            return client.spaces.create(...args);
          },
        },
      };

      const resolved = yield* ensureSettingsSpace(host);

      // The canonical space is returned and left alone; the loser deletes only the space it created.
      expect(resolved.id).toBe(canonical.id);
      expect(AppSpace.getDefaultSpaceId(resolved)).toBe(target.id);
      const settingsSpaces = client.spaces
        .get()
        .filter((space) => AppSpace.isSettingsSpace(space) && space.state.get() !== SpaceState.SPACE_DELETED);
      expect(settingsSpaces.map((space) => space.id)).toEqual([canonical.id]);
    }).pipe(Effect.provide(TestLayer)),
  );
});
