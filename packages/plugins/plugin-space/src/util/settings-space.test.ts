//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';
import { Filter } from '@dxos/echo';
import { Expando } from '@dxos/schema';

import { migrateToSettingsSpace } from '../migrations/settings-space';
import * as SpaceSchema from '../types/SpaceSchema';
import { resolveSettingsSpace } from './settings-space';

describe('resolveSettingsSpace', () => {
  it.effect('waits out identity genesis instead of racing it into a duplicate', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      // The ordering object is an Expando; the app registers it via its schema module.
      yield* Effect.tryPromise(() => client.addTypes([Expando.Expando]));

      // The app forks the resolver the moment the first space lands, mid-genesis; forking before
      // genesis reproduces that window (default space published, settings space still pending).
      const resolver = yield* Effect.fork(resolveSettingsSpace(client));
      const { settingsSpace, defaultSpace } = yield* AppSpace.setupIdentitySpaces(client);
      const resolved = yield* Fiber.join(resolver);

      expect(resolved.id).toBe(settingsSpace.id);
      expect(client.spaces.get().filter((space) => AppSpace.isSettingsSpace(space))).toHaveLength(1);

      // The single settings space ends up holding both the designation and the ordering.
      yield* migrateToSettingsSpace({
        settingsSpace: resolved,
        legacySpace: AppSpace.resolveLegacyDefaultSpace(client),
      });
      expect(AppSpace.getDefaultSpaceId(resolved)).toBe(defaultSpace.id);
      const [ordering] = yield* Effect.promise(() =>
        resolved.db.query(Filter.type(Expando.Expando, { key: SpaceSchema.SHARED })).run(),
      );
      expect(ordering).toBeDefined();
      expect(AppSpace.getDefaultSpace(client)?.id).toBe(defaultSpace.id);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('creates the settings space for a legacy profile that predates it', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());

      const legacySpace = yield* Effect.promise(() =>
        client.spaces.create({}, { tags: [AppSpace.PERSONAL_SPACE_TAG] }),
      );
      yield* Effect.promise(() => legacySpace.waitUntilReady());

      const settingsSpace = yield* resolveSettingsSpace(client);

      expect(AppSpace.isSettingsSpace(settingsSpace)).toBe(true);
      expect(client.spaces.get().filter((space) => AppSpace.isSettingsSpace(space))).toHaveLength(1);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('resolves the annotated settings space on a profile carrying a duplicate', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());

      // The duplicate the race used to create lands first in the space list; the genesis-created
      // space carries the default-space designation.
      const duplicate = yield* Effect.promise(() => client.spaces.create({}, { tags: [AppSpace.SETTINGS_SPACE_TAG] }));
      yield* Effect.promise(() => duplicate.waitUntilReady());
      const canonical = yield* Effect.promise(() => client.spaces.create({}, { tags: [AppSpace.SETTINGS_SPACE_TAG] }));
      yield* Effect.promise(() => canonical.waitUntilReady());
      const defaultSpace = yield* Effect.promise(() => client.spaces.create({ name: AppSpace.DEFAULT_SPACE_NAME }));
      yield* Effect.promise(() => defaultSpace.waitUntilReady());
      AppSpace.setDefaultSpaceId(canonical, defaultSpace.id);

      expect(AppSpace.getSettingsSpace(client)?.id).toBe(canonical.id);
      expect((yield* resolveSettingsSpace(client)).id).toBe(canonical.id);
      expect(AppSpace.getDefaultSpace(client)?.id).toBe(defaultSpace.id);
    }).pipe(Effect.provide(TestLayer)),
  );
});
