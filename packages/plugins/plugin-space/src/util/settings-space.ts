//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';

/**
 * Resolve the settings space, creating one only for legacy profiles that predate it.
 *
 * On every other path a tagged settings space is guaranteed to arrive — genesis creates it for
 * fresh profiles, replication delivers it for existing profiles on a new device — so this waits
 * for it rather than creating: an eager create here races {@link AppSpace.setupIdentitySpaces}
 * (which publishes the default space before the settings space) and loses, leaving the profile
 * with a duplicate settings space.
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
