//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';

/**
 * The space list and factory this needs from a `Client`. Structural so a test can present a list
 * that changes between calls — the concurrent-creation race this function exists to resolve.
 */
type SpaceHost = {
  spaces: {
    get(): Space[];
    create(...args: Parameters<Client['spaces']['create']>): ReturnType<Client['spaces']['create']>;
  };
};

/**
 * Find the settings space, creating it if the profile does not have one yet.
 *
 * Profiles created through {@link AppSpace.setupIdentitySpaces} already have one; this covers the
 * profiles that predate the settings space, whose first sight of it is the migration.
 */
export const ensureSettingsSpace = Effect.fnUntraced(function* (client: SpaceHost) {
  const existing = AppSpace.getSettingsSpace(client);
  if (existing) {
    yield* Effect.promise(() => existing.waitUntilReady());
    return existing;
  }

  const created = yield* Effect.promise(() =>
    client.spaces.create({}, { tags: [AppSpace.SETTINGS_SPACE_TAG], membershipPolicy: MembershipPolicy.LOCKED }),
  );
  yield* Effect.promise(() => created.waitUntilReady());

  // Two clients — a second tab, a reload racing the first — can both observe no settings space and
  // both create one. `getSettingsSpace` picks the same winner everywhere, so whoever lost discards
  // the space it just created, which is still empty. Each client only ever deletes its own.
  const canonical = AppSpace.getSettingsSpace(client) ?? created;
  if (canonical.id !== created.id) {
    log.warn('discarding duplicate settings space', { created: created.id, canonical: canonical.id });
    yield* Effect.promise(() => created.delete());
    yield* Effect.promise(() => canonical.waitUntilReady());
    return canonical;
  }

  yield* Effect.promise(() => created.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
  return created;
});
