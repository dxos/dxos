//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { TestLayer } from '@dxos/cli-util/testing';
import { type Client, ClientService } from '@dxos/client';
import { Filter, Obj } from '@dxos/echo';
import { Expando } from '@dxos/schema';

import { SpaceSchema } from '#types';

import { migrateToSettingsSpace, readSpacesOrder } from '../migrations/settings-space';
import { healDuplicateSettingsSpaces, resolveSettingsSpace } from './settings-space';

describe('resolveSettingsSpace', () => {
  it.effect('waits out identity genesis instead of racing it into a duplicate', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      // The ordering object is an Expando; the app registers it via its schema module.
      yield* Effect.tryPromise(() => client.addTypes([Expando.Expando]));

      // The app forks the resolver the moment the first space lands, mid-genesis; forking before
      // genesis reproduces that window (default space published, settings space still pending).
      const resolver = yield* Effect.forkChild(resolveSettingsSpace(client));
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

  it.effect('waits for a replicating settings space instead of creating a duplicate', () =>
    Effect.gen(function* () {
      // A freshly joined or recovered device replays the profile in creation order: the legacy
      // space is visible while the settings space is still in flight, but its HALO membership
      // credential proves it exists. A real client cannot hold that state on demand, so a scripted
      // stand-in drives the resolver; the cast is contained to the test.
      const spaceSubscribers = new Set<() => void>();
      const settingsSpace = {
        id: 'B00000000000000000000000000000002',
        tags: [AppSpace.SETTINGS_SPACE_TAG],
        properties: {},
        waitUntilReady: () => Promise.resolve(),
      };
      const legacySpace = { id: 'B00000000000000000000000000000001', tags: [AppSpace.PERSONAL_SPACE_TAG] };
      const spaces: unknown[] = [legacySpace];
      let createCalls = 0;
      const client = {
        spaces: {
          get: () => spaces,
          subscribe: (callback: () => void) => {
            spaceSubscribers.add(callback);
            callback();
            return { unsubscribe: () => spaceSubscribers.delete(callback) };
          },
          create: () => {
            createCalls++;
            return Promise.resolve(settingsSpace);
          },
        },
        halo: {
          queryCredentials: ({ type }: { type: string }) =>
            type === 'dxos.halo.credentials.SpaceMember'
              ? [{ subject: { assertion: { tags: [AppSpace.SETTINGS_SPACE_TAG] } } }]
              : [],
          credentials: {
            subscribe: (callback: () => void) => {
              callback();
              return { unsubscribe: () => {} };
            },
          },
        },
      } as unknown as Client;

      const resolver = yield* Effect.forkChild(resolveSettingsSpace(client));
      // The settings space lands, as replication eventually delivers it.
      spaces.push(settingsSpace);
      spaceSubscribers.forEach((callback) => callback());
      const resolved = yield* Fiber.join(resolver);

      expect(resolved.id).toBe(settingsSpace.id);
      expect(createCalls).toBe(0);
    }),
  );

  it.effect('heals duplicate settings spaces onto the canonical one', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.addTypes([Expando.Expando]));

      const canonical = yield* Effect.promise(() => client.spaces.create({}, { tags: [AppSpace.SETTINGS_SPACE_TAG] }));
      yield* Effect.promise(() => canonical.waitUntilReady());
      const duplicate = yield* Effect.promise(() => client.spaces.create({}, { tags: [AppSpace.SETTINGS_SPACE_TAG] }));
      yield* Effect.promise(() => duplicate.waitUntilReady());
      const defaultSpace = yield* Effect.promise(() => client.spaces.create({ name: AppSpace.DEFAULT_SPACE_NAME }));
      yield* Effect.promise(() => defaultSpace.waitUntilReady());
      AppSpace.setDefaultSpaceId(canonical, defaultSpace.id);

      // Ordering that accumulated on the losing copy must survive the healing.
      duplicate.db.add(Obj.make(Expando.Expando, { key: SpaceSchema.SHARED, order: [defaultSpace.id] }));
      yield* Effect.promise(() => duplicate.db.flush());

      yield* healDuplicateSettingsSpaces(client);
      yield* awaitCondition(client, () => client.spaces.get().filter(AppSpace.isSettingsSpace).length === 1);

      expect(AppSpace.getSettingsSpace(client)?.id).toBe(canonical.id);
      expect(AppSpace.getDefaultSpaceId(canonical)).toBe(defaultSpace.id);
      expect(yield* readSpacesOrder(canonical)).toEqual([defaultSpace.id]);
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

/** The space list replays on subscribe, so the current state is checked before any wait. */
const awaitCondition = (client: Client, predicate: () => boolean): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    const sub = client.spaces.subscribe(() => {
      if (predicate()) {
        resume(Effect.void);
      }
    });
    return Effect.sync(() => sub.unsubscribe());
  });
