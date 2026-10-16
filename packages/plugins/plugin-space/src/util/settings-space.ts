//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Queue from 'effect/Queue';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client } from '@dxos/client';
import { type Space, SpaceProperties, SpaceState } from '@dxos/client/echo';
import { Annotation, Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { createIdFromSpaceKey } from '@dxos/echo-protocol';
import { log } from '@dxos/log';
import { MigrationVersionAnnotation } from '@dxos/migrations';
import { EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { MembershipPolicy } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import {
  isSpacesOrder,
  mergeSpacesOrder,
  readSpacesOrder,
  removeFromSpacesOrder,
} from '../migrations/settings-space.ts';

/** How long a merged settings space is kept, so a device that was offline can land its writes there. */
export const MERGED_SPACE_GRACE = Duration.days(7);

const EDGE_SYNC_TIMEOUT = 60_000;

/**
 * Resolve the settings space to read now, waiting until one is visible.
 *
 * Never creates one: {@link runSettingsSpaceConvergence} does that, and only once the HALO is in sync
 * with EDGE. The space list and the credential stream both replay on subscribe, so the current state
 * is checked with no gap in which an arriving space or credential could be missed.
 */
export const resolveSettingsSpace = Effect.fnUntraced(function* (client: Client) {
  const space = yield* Effect.callback<Space>((resume) => {
    const check = () => {
      const settingsSpace = AppSpace.getSettingsSpace(client);
      if (settingsSpace) {
        resume(Effect.succeed(settingsSpace));
      }
    };
    const spaces = client.spaces.subscribe(check);
    const credentials = client.halo.credentials.subscribe(check);
    return Effect.sync(() => {
      spaces.unsubscribe();
      credentials.unsubscribe();
    });
  });

  yield* Effect.promise(() => space.waitUntilReady());
  return space;
});

/**
 * The settings object the settings space names. Named at genesis; a space that predates the name is
 * given one here, and so is one whose name dangles, since nothing else would ever repoint it.
 */
export const resolveAppSettings = Effect.fnUntraced(function* (space: Space) {
  return yield* Annotation.get(space.properties, AppAnnotation.AppSettingsAnnotation).pipe(
    Option.match({
      onSome: (ref) =>
        Database.load(ref).pipe(
          Effect.catchTag('EntityNotFoundError', () => {
            log.warn('settings object not found; naming a fresh one', { uri: ref.uri });
            return Effect.sync(() => nameSettings(space));
          }),
        ),
      onNone: () => Effect.sync(() => nameSettings(space)),
    }),
  );
});

/** Add an empty settings object to the space and name it on its properties. */
const nameSettings = (space: Space): AppSettings.AppSettings => {
  const settings = space.db.add(AppSettings.make());
  Obj.update(space.properties, (properties) => {
    Annotation.set(properties, AppAnnotation.AppSettingsAnnotation, Ref.make(settings));
  });
  return settings;
};

//
// Canonicalization.
//

/**
 * Settle the profile on one settings space and converge the others into it: wait for the HALO to
 * sync with EDGE (retrying while offline), make sure a credential names the canonical space, then
 * heal. Runs for the life of the plugin; interruption stops it.
 */
export const runSettingsSpaceConvergence = Effect.fnUntraced(function* (client: Client) {
  yield* Effect.tryPromise(() => client.halo.syncToEdge()).pipe(
    Effect.tapError((cause) => Effect.sync(() => log('HALO not in sync with EDGE; retrying', { cause }))),
    Effect.retry(Schedule.min([Schedule.exponential('1 second'), Schedule.spaced('1 minute')])),
  );
  yield* canonicalizeSettingsSpace(client);
  yield* runSettingsSpaceHealing(client);
});

/**
 * Make sure a `SettingsSpace` credential names the canonical settings space. The caller must have
 * synced the HALO with EDGE: every synced device then sees the same settings spaces in its HALO and
 * names the same one, the lowest id.
 *
 * Creates a settings space only for a legacy profile that predates it. On any other profile with none,
 * identity genesis is still creating it and will name it, so this waits rather than racing it.
 */
export const canonicalizeSettingsSpace = Effect.fnUntraced(function* (client: Client) {
  while (!AppSpace.getCanonicalSettingsSpaceId(client)) {
    const [lowest] = yield* listSettingsSpacesInHalo(client);
    if (lowest) {
      yield* Effect.promise(() => AppSpace.writeSettingsSpaceCredential(client, lowest));
      log.info('named the canonical settings space', { spaceId: lowest.id });
    } else if (AppSpace.resolveLegacyDefaultSpace(client)) {
      const space = yield* createSettingsSpace(client);
      yield* Effect.promise(() => AppSpace.writeSettingsSpaceCredential(client, space));
      log.info('created the settings space for a legacy profile', { spaceId: space.id });
    } else {
      yield* awaitHaloOrSpaceChange(client);
      continue;
    }

    // Every write appends to the HALO, so wait for this one rather than writing again.
    yield* awaitCanonicalCredential(client);
  }
});

const awaitCanonicalCredential = (client: Client): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    const check = () => AppSpace.getCanonicalSettingsSpaceId(client) !== undefined && resume(Effect.void);
    const credentials = client.halo.credentials.subscribe(check);
    check();
    return Effect.sync(() => credentials.unsubscribe());
  });

/**
 * Every settings space this identity's HALO records a membership for, lowest id first, leaving out any
 * a `SpaceDeleted` credential tombstoned. Read from credentials rather than the space list, so a space
 * still opening on this device counts too.
 */
const listSettingsSpacesInHalo = Effect.fnUntraced(function* (client: Client) {
  const spaces = yield* Effect.promise(() =>
    Promise.all(
      AppSpace.getSettingsSpaceKeysInHalo(client).map(async (key) => ({ id: await createIdFromSpaceKey(key), key })),
    ),
  );
  return spaces.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
});

const createSettingsSpace = Effect.fnUntraced(function* (client: Client) {
  const space = yield* Effect.promise(() =>
    client.spaces.create(
      {},
      { tags: [AppSpace.SETTINGS_SPACE_TAG], membershipPolicy: MembershipPolicy.LOCKED, origin: 'system' },
    ),
  );
  yield* Effect.promise(() => space.waitUntilReady());
  yield* Effect.promise(() => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
  return space;
});

/** The next change to the space list or the HALO credentials; the replays on subscribe are skipped. */
const awaitHaloOrSpaceChange = (client: Client): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    let armed = false;
    const wake = () => armed && resume(Effect.void);
    const spaces = client.spaces.subscribe(wake);
    const credentials = client.halo.credentials.subscribe(wake);
    armed = true;
    return Effect.sync(() => {
      spaces.unsubscribe();
      credentials.unsubscribe();
    });
  });

//
// Healing.
//

/**
 * Converge duplicate settings spaces into the canonical one. Passes are driven by a sliding(1) queue
 * subscribed before the first pass, so a change landing mid-pass is consumed by the next pass rather
 * than lost to a re-subscribe window. Exits once every known space has settled; anything that reaches
 * a duplicate after that is merged on the next boot.
 */
export const runSettingsSpaceHealing = Effect.fnUntraced(function* (client: Client) {
  const wake = yield* Queue.sliding<void>(1);
  const spaces = client.spaces.subscribe(() => void Queue.offerUnsafe(wake, undefined));
  const credentials = client.halo.credentials.subscribe(() => void Queue.offerUnsafe(wake, undefined));
  return yield* Effect.gen(function* () {
    while (true) {
      yield* Queue.take(wake);
      yield* healDuplicateSettingsSpaces(client).pipe(catchNonInterrupt('settings space healing pass failed'));
      const all = client.spaces.get();
      if (all.length > 0 && all.every((space) => isSettledSpaceState(space.state.get()))) {
        return;
      }
    }
  }).pipe(
    Effect.ensuring(
      Effect.sync(() => {
        spaces.unsubscribe();
        credentials.unsubscribe();
      }),
    ),
  );
});

/** States a space rests in, as opposed to the transitional states of a space still opening. */
const isSettledSpaceState = (state: SpaceState): boolean =>
  state !== SpaceState.SPACE_CLOSED &&
  state !== SpaceState.SPACE_INITIALIZING &&
  state !== SpaceState.SPACE_CONTROL_ONLY;

/**
 * One healing pass: merge every other ready settings space into the canonical one, and delete those
 * {@link isSafeToDelete} clears. Does nothing until a credential names the canonical space, so no
 * device-local view ever picks the survivor.
 */
export const healDuplicateSettingsSpaces = Effect.fnUntraced(function* (
  client: Client,
  { now = Date.now() }: { now?: number } = {},
) {
  const canonicalId = AppSpace.getCanonicalSettingsSpaceId(client);
  const canonical = canonicalId ? client.spaces.get().find((space) => space.id === canonicalId) : undefined;
  if (!canonical || canonical.state.get() !== SpaceState.SPACE_READY) {
    return;
  }

  const sources = AppSpace.getSettingsSpaces(client).filter(
    (space) => space !== canonical && space.state.get() === SpaceState.SPACE_READY,
  );
  for (const source of sources) {
    // A failure on one source (e.g. it is closing) must not strand the rest; a later pass retries it.
    yield* Effect.gen(function* () {
      if (!(yield* mergeSettingsSpace(client, canonical, source))) {
        return;
      }

      if (yield* isSafeToDelete(client, source, now)) {
        yield* Effect.promise(() => source.delete());
        log.info('removed merged settings space', { source: source.id, canonical: canonical.id });
      }
    }).pipe(catchNonInterrupt('failed to merge settings space', () => ({ source: source.id })));
  }
});

/**
 * Merge everything `source` holds into `canonical` and move it out of `source`: each settings key, each
 * properties annotation and each ordering entry the canonical space lacks is added (canonical wins
 * conflicts), then removed from the source. A value that changed in the source meanwhile stays, so the
 * next pass merges the newer one; a key the user later clears in canonical is never brought back.
 *
 * Both spaces are synced with EDGE first. ECHO's convergence merge keeps the oldest settings object in
 * a space whole, so merging into one made while the original was still replicating would lose the keys.
 *
 * @returns Whether the source is merged. False when a sync fails or the canonical object cannot load.
 */
const mergeSettingsSpace = Effect.fnUntraced(function* (client: Client, canonical: Space, source: Space) {
  if (!(yield* syncWithEdge(client, canonical)) || !(yield* syncWithEdge(client, source))) {
    return false;
  }

  const target = yield* Annotation.get(canonical.properties, AppAnnotation.AppSettingsAnnotation).pipe(
    Option.match({
      onSome: (ref) => Database.load(ref).pipe(Effect.option, Effect.map(Option.getOrUndefined)),
      onNone: () => Effect.succeed(nameSettings(canonical)),
    }),
  );
  if (!target) {
    log.warn('canonical settings object not loadable; merging later', { canonical: canonical.id });
    return false;
  }

  const sourceSettings = yield* Effect.promise(() => source.db.query(Filter.type(AppSettings.AppSettings)).run());
  const snapshots = sourceSettings
    .map((settings) => [settings, Obj.getSnapshot(settings).shared] as const)
    .filter(([, shared]) => Object.keys(shared).length > 0);
  for (const [, shared] of snapshots) {
    Obj.update(target, (target) => {
      for (const [namespace, values] of Object.entries(shared)) {
        target.shared[namespace] ??= {};
        const into = target.shared[namespace];
        for (const [key, value] of Object.entries(values)) {
          if (!(key in into)) {
            into[key] = structuredClone(value);
          }
        }
      }
    });
  }

  const sourceAnnotations = Obj.getMeta(Obj.getSnapshot(source.properties)).annotations;
  const moved = Object.entries(sourceAnnotations)
    // `Object.entries` erases the key brand; decoding restores it without a cast.
    .map(([rawKey, value]) => [Schema.decodeSync(Annotation.Key)(rawKey), value] as const)
    .filter(([key, value]) => isProfileAnnotation(key, value));
  if (moved.length > 0) {
    Obj.update(canonical.properties, (properties) => {
      const annotations = Obj.getMeta(properties).annotations;
      for (const [key, value] of moved) {
        if (!(key in annotations)) {
          annotations[key] = value;
        }
      }
    });
  }

  const order = yield* readSpacesOrder(source);
  if (!(yield* mergeSpacesOrder(canonical, source))) {
    return false;
  }

  // Durable in canonical before anything leaves the source.
  yield* Effect.promise(() => canonical.db.flush());

  // Canonical now holds every snapshotted key, its own value or the one just copied; a key whose
  // source value changed since the snapshot is newer than both and stays for the next pass.
  for (const [settings, shared] of snapshots) {
    Obj.update(settings, (settings) => {
      for (const [namespace, values] of Object.entries(shared)) {
        const from = settings.shared[namespace];
        for (const [key, value] of Object.entries(values)) {
          if (from && isEqual(from[key], value)) {
            delete from[key];
          }
        }
        if (from && Object.keys(from).length === 0) {
          delete settings.shared[namespace];
        }
      }
    });
  }

  const marked = Option.isSome(Annotation.get(source.properties, AppAnnotation.MergedIntoAnnotation));
  if (moved.length > 0 || !marked) {
    Obj.update(source.properties, (properties) => {
      const annotations = Obj.getMeta(properties).annotations;
      for (const [key, value] of moved) {
        if (isEqual(annotations[key], value)) {
          delete annotations[key];
        }
      }
      if (!marked) {
        Annotation.set(properties, AppAnnotation.MergedIntoAnnotation, { spaceId: canonical.id, mergedAt: Date.now() });
      }
    });
  }
  if (!marked) {
    log.info('merged settings space', { source: source.id, canonical: canonical.id });
  }

  yield* removeFromSpacesOrder(source, order);
  yield* Effect.promise(() => source.db.flush());
  return true;
});

/**
 * Whether a merged source may be deleted: no credential names it, it was first merged at least
 * {@link MERGED_SPACE_GRACE} ago, and after syncing with EDGE it holds nothing a pass would merge. The
 * checks after the sync do not wait, so a write that landed during it keeps the space.
 */
const isSafeToDelete = Effect.fnUntraced(function* (client: Client, source: Space, now: number) {
  const mark = Annotation.get(source.properties, AppAnnotation.MergedIntoAnnotation).pipe(Option.getOrUndefined);
  if (!mark || now - mark.mergedAt < Duration.toMillis(MERGED_SPACE_GRACE)) {
    return false;
  }
  if (!(yield* syncWithEdge(client, source))) {
    return false;
  }

  const objects = source.db.query(Query.select(Filter.everything())).runSync();
  const holdsNothing = objects.every(
    (object) =>
      Obj.instanceOf(SpaceProperties, object) ||
      (Obj.instanceOf(AppSettings.AppSettings, object) && Object.keys(object.shared).length === 0) ||
      (isSpacesOrder(object) && Array.isArray(object.order) && object.order.length === 0),
  );
  // Merging moved every other annotation out, so one left is new or holds a reference it cannot move.
  const annotations = Object.keys(Obj.getMeta(source.properties).annotations);
  return (
    holdsNothing &&
    annotations.every((key) => SPACE_ANNOTATIONS.has(key)) &&
    !AppSpace.getCredentialedSettingsSpaceIds(client).includes(source.id)
  );
});

/**
 * Annotations that describe the profile and move to the canonical space. The rest describe the source
 * space itself, and a reference is relative to its own space, so a copied one would name nothing.
 */
const isProfileAnnotation = (key: string, value: unknown): boolean => !SPACE_ANNOTATIONS.has(key) && !holdsRef(value);

const SPACE_ANNOTATIONS = new Set<string>([
  AppAnnotation.AppSettingsAnnotation.key,
  AppAnnotation.MergedIntoAnnotation.key,
  AppAnnotation.RootCollectionAnnotation.key,
  AppAnnotation.SpaceTemplateAnnotation.key,
  MigrationVersionAnnotation.key,
]);

const holdsRef = (value: unknown): boolean =>
  Ref.isRef(value) || (typeof value === 'object' && value !== null && Object.values(value).some(holdsRef));

const isEqual = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Sync a space with EDGE, so this device holds everything EDGE has for it. A client with no EDGE has no
 * remote to be behind; a space that does not replicate to EDGE cannot be shown complete.
 */
const syncWithEdge = Effect.fnUntraced(function* (client: Client, space: Space) {
  if (!client.config.values.runtime?.services?.edge?.url) {
    return true;
  }
  if (space.internal.data.edgeReplication !== EdgeReplicationSetting.ENABLED) {
    return false;
  }

  return yield* Effect.tryPromise(() =>
    space.internal.syncToEdge({ timeout: EDGE_SYNC_TIMEOUT, onProgress: () => {} }),
  ).pipe(
    Effect.as(true),
    Effect.catch((cause) =>
      Effect.sync(() => {
        log('settings space not in sync with EDGE', { space: space.id, cause });
        return false;
      }),
    ),
  );
});

/**
 * Log a failure and continue, but let interruption through: `catchCause` also traps interrupts,
 * and swallowing them here would resist fiber teardown and log spurious failures on shutdown.
 */
export const catchNonInterrupt =
  (message: string, context?: () => Record<string, unknown>) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A | void, E, R> =>
    effect.pipe(
      Effect.catchCause((cause) =>
        Cause.hasInterruptsOnly(cause)
          ? Effect.failCause(cause)
          : Effect.sync(() => log.warn(message, { ...context?.(), cause })),
      ),
    );
