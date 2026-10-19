//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { TestLayer } from '@dxos/cli-util/testing';
import { type Client, ClientService } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Annotation, Database, Filter, Obj, Ref } from '@dxos/echo';
import { Expando } from '@dxos/schema';

import { SpaceSchema } from '#types';

import { migrateToSettingsSpace, readSpacesOrder } from '../migrations/settings-space.ts';
import {
  MERGED_SPACE_GRACE,
  canonicalizeSettingsSpace,
  healDuplicateSettingsSpaces,
  resolveAppSettings,
  resolveSettingsSpace,
  runSettingsSpaceConvergence,
} from './settings-space.ts';

describe('resolveSettingsSpace', () => {
  it.effect('waits out identity genesis, which names its settings space', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;

      // The app forks the resolver the moment the first space lands, mid-genesis; forking before
      // genesis reproduces that window (default space published, settings space still pending).
      const resolver = yield* Effect.forkChild(resolveSettingsSpace(client));
      const { settingsSpace, defaultSpace } = yield* AppSpace.setupIdentitySpaces(client);
      const resolved = yield* Fiber.join(resolver);

      expect(resolved.id).toBe(settingsSpace.id);
      expect(AppSpace.getSettingsSpaces(client)).toHaveLength(1);
      yield* awaitCredentials(client, () => AppSpace.getCanonicalSettingsSpaceId(client) === settingsSpace.id);

      yield* migrateToSettingsSpace({
        settingsSpace: resolved,
        legacySpace: AppSpace.resolveLegacyDefaultSpace(client),
      });
      expect(AppSpace.getDefaultSpace(client)?.id).toBe(defaultSpace.id);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('reads the designated duplicate until a credential names a space', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;
      const [lower, higher] = yield* createSettingsSpaces(client, 2);
      const defaultSpace = yield* createSpace(client, { name: AppSpace.DEFAULT_SPACE_NAME });
      AppSpace.setDefaultSpaceId(higher, defaultSpace.id);

      expect((yield* resolveSettingsSpace(client)).id).toBe(higher.id);

      yield* nameCanonical(client, lower);
      expect(AppSpace.getSettingsSpace(client)?.id).toBe(lower.id);
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe('resolveAppSettings', () => {
  it.effect('names a fresh settings object when the named one is missing', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;
      const [space] = yield* createSettingsSpaces(client, 1);
      const missing = space.db.add(AppSettings.make());
      Obj.update(space.properties, (properties) => {
        Annotation.set(properties, AppAnnotation.AppSettingsAnnotation, Ref.make(missing));
      });
      space.db.remove(missing);

      const settings = yield* resolveAppSettings(space);

      expect(settings.id).not.toBe(missing.id);
      const named = Annotation.get(space.properties, AppAnnotation.AppSettingsAnnotation).pipe(Option.getOrThrow);
      expect(yield* Database.load(named)).toBe(settings);
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe('canonicalizeSettingsSpace', () => {
  it.effect('names the lowest-id settings space the HALO records', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;
      const [lower] = yield* createSettingsSpaces(client, 2);

      yield* canonicalizeSettingsSpace(client);

      expect(AppSpace.getCanonicalSettingsSpaceId(client)).toBe(lower.id);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('keeps the space an existing credential names', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;
      const [, higher] = yield* createSettingsSpaces(client, 2);
      yield* nameCanonical(client, higher);

      yield* canonicalizeSettingsSpace(client);

      expect(AppSpace.getCredentialedSettingsSpaceIds(client)).toEqual([higher.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('creates and names the settings space for a legacy profile that predates it', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;
      yield* createSpace(client, {}, { tags: [AppSpace.PERSONAL_SPACE_TAG] });

      yield* canonicalizeSettingsSpace(client);

      const [settingsSpace] = AppSpace.getSettingsSpaces(client);
      expect(AppSpace.getSettingsSpaces(client)).toHaveLength(1);
      expect(AppSpace.getCanonicalSettingsSpaceId(client)).toBe(settingsSpace.id);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('ignores a credential naming a deleted space', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;
      const [lower, higher] = yield* createSettingsSpaces(client, 2);
      yield* nameCanonical(client, lower);
      yield* Effect.promise(() => lower.delete());
      yield* awaitCredentials(client, () => AppSpace.getCanonicalSettingsSpaceId(client) === undefined);

      yield* canonicalizeSettingsSpace(client);

      expect(AppSpace.getCanonicalSettingsSpaceId(client)).toBe(higher.id);
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe('settings space healing', () => {
  it.effect('does nothing until a credential names the canonical space', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;
      const [, higher] = yield* createSettingsSpaces(client, 2);
      yield* writeSettings(higher, { 'org.dxos.plugin.a': { theme: 'dark' } });

      yield* healDuplicateSettingsSpaces(client, { now: afterGrace() });

      expect(AppSpace.getSettingsSpaces(client)).toHaveLength(2);
      expect(readSettings(higher)).toEqual({ 'org.dxos.plugin.a': { theme: 'dark' } });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('merges key by key, canonical wins, and moves merged keys out of the source', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;
      const [canonical, source] = yield* createSettingsSpaces(client, 2);
      yield* nameCanonical(client, canonical);
      yield* writeSettings(canonical, { plugins: { a: { enabled: true } } });
      yield* writeSettings(source, { plugins: { a: { enabled: false }, b: { enabled: true } } });
      const defaultSpace = yield* createSpace(client, { name: AppSpace.DEFAULT_SPACE_NAME });
      AppSpace.setDefaultSpaceId(source, defaultSpace.id);
      source.db.add(Obj.make(Expando.Expando, { key: SpaceSchema.SHARED, order: [defaultSpace.id] }));

      yield* healDuplicateSettingsSpaces(client);

      // `plugins` is keyed per plugin id, so `b` arrives even though canonical has the namespace.
      expect(readSettings(canonical)).toEqual({ plugins: { a: { enabled: true }, b: { enabled: true } } });
      expect(AppSpace.getDefaultSpaceId(canonical)).toBe(defaultSpace.id);
      expect(yield* readSpacesOrder(canonical)).toEqual([defaultSpace.id]);
      expect(readSettings(source)).toEqual({});
      expect(AppSpace.getDefaultSpaceId(source)).toBeUndefined();
      expect(yield* readSpacesOrder(source)).toEqual([]);
      expect(AppSpace.isMergedSettingsSpace(source)).toBe(true);
      // Kept through the grace period.
      expect(AppSpace.getSettingsSpaces(client)).toHaveLength(2);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a key cleared in canonical after a merge is not brought back', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;
      const [canonical, source] = yield* createSettingsSpaces(client, 2);
      yield* nameCanonical(client, canonical);
      yield* writeSettings(source, { ns: { key: 'value' } });
      yield* healDuplicateSettingsSpaces(client);

      Obj.update(yield* resolveAppSettings(canonical), (settings) => {
        delete settings.shared.ns;
      });
      yield* healDuplicateSettingsSpaces(client);

      expect(readSettings(canonical)).toEqual({});
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a write that reaches the source after a merge is merged by the next pass', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;
      const [canonical, source] = yield* createSettingsSpaces(client, 2);
      yield* nameCanonical(client, canonical);
      yield* healDuplicateSettingsSpaces(client);

      yield* writeSettings(source, { ns: { late: 1 } });
      yield* healDuplicateSettingsSpaces(client, { now: afterGrace() });

      expect(readSettings(canonical)).toEqual({ ns: { late: 1 } });
      // The mark dates from the first merge, so with the grace passed and the source empty again it goes.
      yield* awaitSpaces(client, () => AppSpace.getSettingsSpaces(client).length === 1);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('deletes an emptied source once its grace period has passed', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;
      const [canonical, source] = yield* createSettingsSpaces(client, 2);
      yield* nameCanonical(client, canonical);
      yield* writeSettings(source, { ns: { key: 'value' } });
      yield* healDuplicateSettingsSpaces(client);
      expect(AppSpace.getSettingsSpaces(client)).toHaveLength(2);

      yield* healDuplicateSettingsSpaces(client, { now: afterGrace() });

      yield* awaitSpaces(client, () => AppSpace.getSettingsSpaces(client).length === 1);
      expect(AppSpace.getSettingsSpace(client)?.id).toBe(canonical.id);
      expect(readSettings(canonical)).toEqual({ ns: { key: 'value' } });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('keeps a source holding content it cannot merge', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;
      const [canonical, source] = yield* createSettingsSpaces(client, 2);
      yield* nameCanonical(client, canonical);
      source.db.add(Obj.make(Expando.Expando, { key: 'unrelated-content' }));

      yield* healDuplicateSettingsSpaces(client);
      yield* healDuplicateSettingsSpaces(client, { now: afterGrace() });

      expect(AppSpace.getSettingsSpaces(client)).toHaveLength(2);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('merges but never deletes a space a credential names; the lowest named one wins', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;
      const [lower, higher] = yield* createSettingsSpaces(client, 2);
      // Two devices canonicalized at once from different views.
      yield* nameCanonical(client, higher);
      yield* nameCanonical(client, lower);

      yield* healDuplicateSettingsSpaces(client);
      yield* healDuplicateSettingsSpaces(client, { now: afterGrace() });

      expect(AppSpace.getSettingsSpace(client)?.id).toBe(lower.id);
      expect(AppSpace.getSettingsSpaces(client)).toHaveLength(2);
      expect(AppSpace.isMergedSettingsSpace(higher)).toBe(true);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('convergence names the canonical space, merges the rest, and exits once spaces settle', () =>
    Effect.gen(function* () {
      const client = yield* setupIdentity;
      const [lower, higher] = yield* createSettingsSpaces(client, 2);
      yield* writeSettings(higher, { ns: { key: 'value' } });

      yield* runSettingsSpaceConvergence(client);

      expect(AppSpace.getCanonicalSettingsSpaceId(client)).toBe(lower.id);
      expect(readSettings(lower)).toEqual({ ns: { key: 'value' } });
      expect(AppSpace.isMergedSettingsSpace(higher)).toBe(true);
    }).pipe(Effect.provide(TestLayer)),
  );
});

const setupIdentity = Effect.gen(function* () {
  const client = yield* ClientService;
  yield* Effect.tryPromise(() => client.halo.createIdentity());
  yield* Effect.tryPromise(() => client.addTypes([Expando.Expando, AppSettings.AppSettings]));
  return client;
});

/** `count` ready settings spaces, lowest id first. */
const createSettingsSpaces = Effect.fnUntraced(function* (client: Client, count: number) {
  for (let i = 0; i < count; i++) {
    yield* createSpace(client, {}, { tags: [AppSpace.SETTINGS_SPACE_TAG] });
  }
  return AppSpace.getSettingsSpaces(client);
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

const nameCanonical = Effect.fnUntraced(function* (client: Client, space: Space) {
  yield* Effect.promise(() => AppSpace.writeSettingsSpaceCredential(client, space));
  yield* awaitCredentials(client, () => AppSpace.getCredentialedSettingsSpaceIds(client).includes(space.id));
});

const writeSettings = Effect.fnUntraced(function* (space: Space, shared: AppSettings.Namespaces) {
  const settings = yield* resolveAppSettings(space);
  Obj.update(settings, (settings) => {
    for (const [namespace, values] of Object.entries(shared)) {
      settings.shared[namespace] = { ...settings.shared[namespace], ...values };
    }
  });
});

const readSettings = (space: Space): AppSettings.Namespaces => {
  const [settings] = space.db.query(Filter.type(AppSettings.AppSettings)).runSync();
  return settings ? Obj.getSnapshot(settings).shared : {};
};

const afterGrace = () => Date.now() + Duration.toMillis(MERGED_SPACE_GRACE) + 1;

/** The space list replays on subscribe, so the current state is checked before any wait. */
const awaitSpaces = (client: Client, predicate: () => boolean): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    const sub = client.spaces.subscribe(() => predicate() && resume(Effect.void));
    return Effect.sync(() => sub.unsubscribe());
  });

const awaitCredentials = (client: Client, predicate: () => boolean): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    const sub = client.halo.credentials.subscribe(() => predicate() && resume(Effect.void));
    if (predicate()) {
      resume(Effect.void);
    }
    return Effect.sync(() => sub.unsubscribe());
  });
