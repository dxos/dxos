//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client } from '@dxos/client';
import { type Space, SpaceState } from '@dxos/client/echo';
import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';

import { mergeSpacesOrder } from '../migrations/settings-space';

/**
 * Resolve the settings space, creating one only for legacy profiles that predate it.
 *
 * On every other path a tagged settings space is guaranteed to arrive — genesis creates it for
 * fresh profiles, replication delivers it for existing profiles on a new device — so this waits
 * for it rather than creating: an eager create here races {@link AppSpace.setupIdentitySpaces}
 * (which publishes the default space before the settings space) and loses, leaving the profile
 * with a duplicate settings space.
 *
 * A visible legacy space is NOT proof the profile predates the settings space: the legacy tag is
 * immutable and outlives the migration, and spaces replicate to a device in creation order, so on
 * a freshly joined or recovered device the legacy space lands before the settings space and this
 * creates a duplicate. Absence is unprovable in an eventually-consistent system, so rather than
 * guard the create, {@link healDuplicateSettingsSpaces} converges the profile back to one.
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
 * Converge duplicate settings spaces onto the canonical one.
 *
 * The duplicate-creation race left profiles carrying several tagged spaces, one per device boot
 * that concluded "legacy profile" before the real settings space replicated in. Every device
 * resolves the same canonical space ({@link AppSpace.getSettingsSpace} orders candidates by id),
 * folds each duplicate's cross-space ordering into it, and tombstones the duplicate; the deletion
 * replicates through the HALO, so the profile converges to one settings space everywhere.
 *
 * Runs only once the canonical space is ready and carries the default-space designation — an
 * undesignated winner may still be the stand-in for an unopened rival — and consumes only
 * duplicates that are themselves ready, since an unopened duplicate cannot be salvaged; later
 * passes pick those up as they open.
 */
export const healDuplicateSettingsSpaces = Effect.fnUntraced(function* (client: Client) {
  const canonical = AppSpace.getSettingsSpace(client);
  if (
    !canonical ||
    canonical.state.get() !== SpaceState.SPACE_READY ||
    AppSpace.getDefaultSpaceId(canonical) === undefined
  ) {
    return;
  }

  const duplicates = client.spaces
    .get()
    .filter(
      (space) =>
        AppSpace.isSettingsSpace(space) && space.id !== canonical.id && space.state.get() === SpaceState.SPACE_READY,
    );
  for (const duplicate of duplicates) {
    // A failure on one duplicate (e.g. it is closing) must not strand the rest; it stays tagged
    // and a later pass retries it.
    yield* Effect.gen(function* () {
      yield* mergeSpacesOrder(canonical, duplicate);
      yield* Effect.promise(() => duplicate.delete());
      log.info('removed duplicate settings space', { duplicate: duplicate.id, canonical: canonical.id });
    }).pipe(
      Effect.catchCause((cause) =>
        Effect.sync(() => log.warn('failed to remove duplicate settings space', { duplicate: duplicate.id, cause })),
      ),
    );
  }
});
