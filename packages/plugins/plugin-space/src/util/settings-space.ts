//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client } from '@dxos/client';
import { type Space, SpaceProperties, SpaceState } from '@dxos/client/echo';
import { Annotation, Filter, Obj, Query } from '@dxos/echo';
import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';

import { isSpacesOrder, mergeSpacesOrder } from '../migrations/settings-space.ts';

/**
 * Resolve the settings space, creating one only for legacy profiles that predate it.
 *
 * On every other path a tagged settings space is guaranteed to arrive — genesis creates it for
 * fresh profiles, replication delivers it for existing profiles on a new device — so this waits
 * for it rather than creating: an eager create here races {@link AppSpace.setupIdentitySpaces}
 * (which publishes the default space before the settings space) and loses, leaving the profile
 * with a duplicate settings space.
 *
 * A visible legacy space is not proof the profile predates it (the immutable legacy tag outlives
 * migration, and replication delivers the legacy space first), so the create can still duplicate;
 * {@link runSettingsSpaceHealing} converges the profile rather than this guarding harder.
 */
export const resolveSettingsSpace = Effect.fnUntraced(function* (client: Client) {
  // The space list replays on subscribe, so the current state is checked with no gap in which an
  // arriving settings space could be missed.
  const existing = yield* Effect.callback<Space | undefined>((resume) => {
    const sub = client.spaces.subscribe(() => {
      const settingsSpace = AppSpace.getSettingsSpace(client);
      if (settingsSpace) {
        resume(Effect.succeed(settingsSpace));
      } else if (AppSpace.resolveLegacyDefaultSpace(client)) {
        resume(Effect.succeed(undefined));
      }
    });
    return Effect.sync(() => sub.unsubscribe());
  });
  if (!existing) {
    return yield* ensureSettingsSpace(client);
  }

  yield* Effect.promise(() => existing.waitUntilReady());
  return existing;
});

/**
 * Find the settings space, creating it if the profile does not have one yet.
 *
 * Profiles created through {@link AppSpace.setupIdentitySpaces} already have one; this covers the
 * profiles that predate the settings space, whose first sight of it is the migration. Callers that
 * cannot prove the profile is legacy use {@link resolveSettingsSpace} instead.
 */
export const ensureSettingsSpace = Effect.fnUntraced(function* (client: Client) {
  const existing = AppSpace.getSettingsSpace(client);
  if (existing) {
    yield* Effect.promise(() => existing.waitUntilReady());
    return existing;
  }

  const space = yield* Effect.promise(() =>
    client.spaces.create({}, { tags: [AppSpace.SETTINGS_SPACE_TAG], membershipPolicy: MembershipPolicy.LOCKED }),
  );
  yield* Effect.promise(() => space.waitUntilReady());
  yield* Effect.promise(() => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
  return space;
});

/**
 * Converge duplicate settings spaces. Passes are driven by a sliding(1) queue subscribed before
 * the first pass, so a list change landing mid-pass is consumed by the next pass rather than lost
 * to a re-subscribe window. Exits once every known space has settled — duplicates only surface
 * while spaces are opening or replicating in, and one that arrives after that is healed next boot.
 */
export const runSettingsSpaceHealing = Effect.fnUntraced(function* (client: Client) {
  const wake = yield* Queue.sliding<void>(1);
  const sub = client.spaces.subscribe(() => void Queue.offerUnsafe(wake, undefined));
  return yield* Effect.gen(function* () {
    while (true) {
      yield* Queue.take(wake);
      yield* healDuplicateSettingsSpaces(client).pipe(catchNonInterrupt('settings space healing pass failed'));
      const spaces = client.spaces.get();
      if (spaces.length > 0 && spaces.every((space) => isSettledSpaceState(space.state.get()))) {
        return;
      }
    }
  }).pipe(Effect.ensuring(Effect.sync(() => sub.unsubscribe())));
});

/** States a space rests in, as opposed to the transitional states of a space still opening. */
const isSettledSpaceState = (state: SpaceState): boolean =>
  state !== SpaceState.SPACE_CLOSED &&
  state !== SpaceState.SPACE_INITIALIZING &&
  state !== SpaceState.SPACE_CONTROL_ONLY;

/**
 * One healing pass: salvage every ready duplicate's content into the survivor, then tombstone it.
 * The survivor is the lowest-id tagged space — a pure function of replicated state, so the global
 * minimum survives every partial view; device-local readiness and designation must not influence
 * the pick, or two mid-sync devices would tombstone each other's.
 */
export const healDuplicateSettingsSpaces = Effect.fnUntraced(function* (client: Client) {
  const [survivor, ...duplicates] = AppSpace.getSettingsSpaces(client);
  // Salvage writes into the survivor, so nothing can be removed until it is readable.
  if (!survivor || duplicates.length === 0 || survivor.state.get() !== SpaceState.SPACE_READY) {
    return;
  }

  for (const duplicate of duplicates) {
    // An unopened duplicate cannot be salvaged; a later pass picks it up as it opens.
    if (duplicate.state.get() !== SpaceState.SPACE_READY) {
      continue;
    }

    // A failure on one duplicate (e.g. it is closing) must not strand the rest; it stays tagged
    // and a later pass retries it.
    yield* Effect.gen(function* () {
      const salvaged = yield* salvageSettingsContent(survivor, duplicate);
      if (!salvaged) {
        log.warn('keeping duplicate settings space: content could not be salvaged', {
          duplicate: duplicate.id,
          survivor: survivor.id,
        });
        return;
      }

      // The tombstone persists immediately while `delete()` flushes only the duplicate's own db,
      // so the salvaged content must be durable first — after the delete the source is gone.
      yield* Effect.promise(() => survivor.db.flush());
      yield* Effect.promise(() => duplicate.delete());
      log.info('removed duplicate settings space', { duplicate: duplicate.id, survivor: survivor.id });
    }).pipe(catchNonInterrupt('failed to remove duplicate settings space', () => ({ duplicate: duplicate.id })));
  }
});

/**
 * Copy everything a duplicate settings space holds into the survivor: every properties annotation
 * the survivor lacks (the survivor wins conflicts) and the cross-space ordering.
 *
 * @returns Whether the duplicate is now fully carried by the survivor and safe to delete. False
 * when it holds content this pass does not know how to salvage — deletion is irreversible, so
 * unknown content keeps the duplicate alive rather than being silently destroyed.
 */
const salvageSettingsContent = Effect.fnUntraced(function* (survivor: Space, duplicate: Space) {
  const objects = yield* Effect.promise(() => duplicate.db.query(Query.select(Filter.everything())).run());
  const unknown = objects.filter((object) => !Obj.instanceOf(SpaceProperties, object) && !isSpacesOrder(object));
  if (unknown.length > 0) {
    return false;
  }

  // Snapshot detaches the values from the duplicate's document; copied by raw key so annotations
  // this code has never heard of survive too (values were validated when written on the duplicate).
  const duplicateAnnotations = Obj.getMeta(Obj.getSnapshot(duplicate.properties)).annotations;
  Obj.update(survivor.properties, (properties) => {
    const annotations = Obj.getMeta(properties).annotations;
    for (const [rawKey, value] of Object.entries(duplicateAnnotations)) {
      // `Object.entries` erases the key brand; decoding restores it without a cast.
      const key = Schema.decodeSync(Annotation.Key)(rawKey);
      if (!(key in annotations)) {
        annotations[key] = value;
      }
    }
  });

  return yield* mergeSpacesOrder(survivor, duplicate);
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
