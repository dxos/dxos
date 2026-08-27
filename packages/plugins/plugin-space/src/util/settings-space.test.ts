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
import { healDuplicateSettingsSpaces, resolveSettingsSpace, runSettingsSpaceHealing } from './settings-space';

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

describe('settings space healing', () => {
  it.effect('the lowest-id space survives when both duplicates are designated, keeping its own designation', () =>
    Effect.gen(function* () {
      const { client, survivor, loser } = yield* setupDuplicates;
      const defaultA = yield* createSpace(client, { name: 'A' });
      const defaultB = yield* createSpace(client, { name: 'B' });

      // The realistic post-race shape: the migration designates every duplicate it resolves.
      AppSpace.setDefaultSpaceId(survivor, defaultA.id);
      AppSpace.setDefaultSpaceId(loser, defaultB.id);
      loser.db.add(Obj.make(Expando.Expando, { key: SpaceSchema.SHARED, order: [defaultB.id] }));
      yield* Effect.promise(() => loser.db.flush());

      yield* healDuplicateSettingsSpaces(client);
      yield* awaitCondition(client, () => AppSpace.getSettingsSpaces(client).length === 1);

      expect(AppSpace.getSettingsSpace(client)?.id).toBe(survivor.id);
      expect(AppSpace.getDefaultSpaceId(survivor)).toBe(defaultA.id);
      expect(yield* readSpacesOrder(survivor)).toEqual([defaultB.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('configuration held only by the duplicate moves to the survivor', () =>
    Effect.gen(function* () {
      const { client, survivor, loser } = yield* setupDuplicates;
      const defaultSpace = yield* createSpace(client, { name: AppSpace.DEFAULT_SPACE_NAME });

      // The previously fatal shape: only the higher-id duplicate is designated, so a
      // designation-first winner rule would tombstone the undesignated survivor.
      AppSpace.setDefaultSpaceId(loser, defaultSpace.id);
      loser.db.add(Obj.make(Expando.Expando, { key: SpaceSchema.SHARED, order: [defaultSpace.id] }));
      yield* Effect.promise(() => loser.db.flush());

      yield* healDuplicateSettingsSpaces(client);
      yield* awaitCondition(client, () => AppSpace.getSettingsSpaces(client).length === 1);

      expect(AppSpace.getSettingsSpace(client)?.id).toBe(survivor.id);
      expect(AppSpace.getDefaultSpaceId(survivor)).toBe(defaultSpace.id);
      expect(yield* readSpacesOrder(survivor)).toEqual([defaultSpace.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a duplicate holding unrecognized content is kept', () =>
    Effect.gen(function* () {
      const { client, loser } = yield* setupDuplicates;

      // Deletion is irreversible, so content the salvage does not understand blocks it.
      loser.db.add(Obj.make(Expando.Expando, { key: 'unrelated-content' }));
      yield* Effect.promise(() => loser.db.flush());

      yield* healDuplicateSettingsSpaces(client);

      expect(AppSpace.getSettingsSpaces(client)).toHaveLength(2);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('the healing loop heals the settled boot snapshot and then exits on its own', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.addTypes([Expando.Expando]));

      // The boot shape: the duplicates already exist and settle as they open.
      const defaultSpace = yield* createSpace(client, { name: AppSpace.DEFAULT_SPACE_NAME });
      const first = yield* createSpace(client, {}, { tags: [AppSpace.SETTINGS_SPACE_TAG] });
      AppSpace.setDefaultSpaceId(first, defaultSpace.id);
      first.db.add(Obj.make(Expando.Expando, { key: SpaceSchema.SHARED, order: [defaultSpace.id] }));
      yield* Effect.promise(() => first.db.flush());
      yield* createSpace(client, {}, { tags: [AppSpace.SETTINGS_SPACE_TAG] });

      const healing = yield* Effect.forkChild(runSettingsSpaceHealing(client));
      // Exits without interruption once every known space has settled and the pass has run.
      yield* Fiber.join(healing);
      yield* awaitCondition(client, () => AppSpace.getSettingsSpaces(client).length === 1);

      // Which copy wins is decided by random ids; the configuration must survive either way.
      const [surviving] = AppSpace.getSettingsSpaces(client);
      expect(AppSpace.getDefaultSpaceId(surviving)).toBe(defaultSpace.id);
      expect(yield* readSpacesOrder(surviving)).toEqual([defaultSpace.id]);
    }).pipe(Effect.provide(TestLayer)),
  );
});

/** Two ready settings-space duplicates, identified by the id order healing uses. */
const setupDuplicates = Effect.gen(function* () {
  const client = yield* ClientService;
  yield* Effect.tryPromise(() => client.halo.createIdentity());
  yield* Effect.tryPromise(() => client.addTypes([Expando.Expando]));
  yield* createSpace(client, {}, { tags: [AppSpace.SETTINGS_SPACE_TAG] });
  yield* createSpace(client, {}, { tags: [AppSpace.SETTINGS_SPACE_TAG] });
  const [survivor, loser] = AppSpace.getSettingsSpaces(client);
  return { client, survivor, loser };
});

const createSpace = Effect.fnUntraced(function* (
  client: Client,
  meta: Parameters<Client['spaces']['create']>[0],
  options?: Parameters<Client['spaces']['create']>[1],
) {
  const space = yield* Effect.promise(() => client.spaces.create(meta, options));
  yield* Effect.promise(() => space.waitUntilReady());
  return space;
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
