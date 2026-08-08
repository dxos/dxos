//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';
import { SpaceState } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { Expando } from '@dxos/schema';

import * as SpaceSchema from '../types/SpaceSchema';
import { ensureSettingsSpace } from '../util/settings-space';
import { migrateToSettingsSpace, readSpacesOrder } from './settings-space';

describe('settings space migration', () => {
  it.effect('designates the legacy space and carries its ordering across', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      // The ordering object is an Expando; the app registers it via its schema module.
      yield* Effect.tryPromise(() => client.addTypes([Expando.Expando]));

      // A profile as it looked before the settings space existed: one tagged, unnamed space
      // carrying the cross-space ordering.
      const legacySpace = yield* Effect.promise(() =>
        client.spaces.create({}, { tags: [AppSpace.PERSONAL_SPACE_TAG] }),
      );
      yield* Effect.promise(() => legacySpace.waitUntilReady());
      const order = ['space-a', 'space-b'];
      legacySpace.db.add(Obj.make(Expando.Expando, { key: SpaceSchema.SHARED, order }));

      const settingsSpace = yield* ensureSettingsSpace(client);
      yield* migrateToSettingsSpace({ settingsSpace, legacySpace });

      expect(AppSpace.getDefaultSpaceId(settingsSpace)).toBe(legacySpace.id);
      expect(yield* readSpacesOrder(settingsSpace)).toEqual(order);
      expect(legacySpace.properties.name).toBe(AppSpace.DEFAULT_SPACE_NAME);
      expect(AppSpace.getDefaultSpace(client)?.id).toBe(legacySpace.id);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('is idempotent and never overwrites an existing designation', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      // The ordering object is an Expando; the app registers it via its schema module.
      yield* Effect.tryPromise(() => client.addTypes([Expando.Expando]));

      const legacySpace = yield* Effect.promise(() =>
        client.spaces.create({ name: 'Renamed' }, { tags: [AppSpace.PERSONAL_SPACE_TAG] }),
      );
      yield* Effect.promise(() => legacySpace.waitUntilReady());
      const chosen = yield* Effect.promise(() => client.spaces.create({ name: 'Chosen' }));
      yield* Effect.promise(() => chosen.waitUntilReady());

      const settingsSpace = yield* ensureSettingsSpace(client);
      AppSpace.setDefaultSpaceId(settingsSpace, chosen.id);
      yield* migrateToSettingsSpace({ settingsSpace, legacySpace });
      yield* migrateToSettingsSpace({ settingsSpace, legacySpace });

      // The user's choice wins, and a space that already has a name keeps it.
      expect(AppSpace.getDefaultSpaceId(settingsSpace)).toBe(chosen.id);
      expect(legacySpace.properties.name).toBe('Renamed');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('recovers a legacy space discovered after the settings space', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.addTypes([Expando.Expando]));

      // First pass: the settings space exists but the legacy space has not resolved yet, so there
      // is nothing to designate and the ordering starts empty.
      const settingsSpace = yield* ensureSettingsSpace(client);
      yield* migrateToSettingsSpace({ settingsSpace, legacySpace: undefined });
      expect(AppSpace.getDefaultSpaceId(settingsSpace)).toBeUndefined();

      // Second pass, once the legacy space turns up: its ordering and designation still transfer.
      const legacySpace = yield* Effect.promise(() =>
        client.spaces.create({}, { tags: [AppSpace.PERSONAL_SPACE_TAG] }),
      );
      yield* Effect.promise(() => legacySpace.waitUntilReady());
      const order = ['space-a', 'space-b'];
      legacySpace.db.add(Obj.make(Expando.Expando, { key: SpaceSchema.SHARED, order }));

      yield* migrateToSettingsSpace({ settingsSpace, legacySpace });

      expect(AppSpace.getDefaultSpaceId(settingsSpace)).toBe(legacySpace.id);
      expect(yield* readSpacesOrder(settingsSpace)).toEqual(order);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('creates the ordering object for a profile with nothing to migrate', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      // The ordering object is an Expando; the app registers it via its schema module.
      yield* Effect.tryPromise(() => client.addTypes([Expando.Expando]));

      const settingsSpace = yield* ensureSettingsSpace(client);
      yield* migrateToSettingsSpace({ settingsSpace, legacySpace: undefined });

      expect(yield* readSpacesOrder(settingsSpace)).toEqual([]);
    }).pipe(Effect.provide(TestLayer)),
  );

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
