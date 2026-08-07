//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Expando } from '@dxos/schema';

import * as SpaceSchema from './types/SpaceSchema';

/** Name written into the settings space properties; it is hidden from the UI but shows in devtools. */
const SETTINGS_SPACE_NAME = 'Settings';

/** Name written into the first space created for a profile, replacing the old translated label. */
export const PERSONAL_SPACE_NAME = 'Personal';

/**
 * Find the settings space, creating it if the profile does not have one yet.
 *
 * Membership is locked at genesis because the space holds the user's app configuration and must
 * never become shareable; EDGE replication keeps the configuration in sync across their devices.
 */
export const ensureSettingsSpace = Effect.fnUntraced(function* (client: Client) {
  const existing = AppSpace.getSettingsSpace(client);
  if (existing) {
    yield* Effect.promise(() => existing.waitUntilReady());
    return existing;
  }

  const space = yield* Effect.promise(() =>
    client.spaces.create(
      { name: SETTINGS_SPACE_NAME },
      { tags: [AppSpace.SETTINGS_SPACE_TAG], membershipPolicy: MembershipPolicy.LOCKED },
    ),
  );
  yield* Effect.promise(() => space.waitUntilReady());
  yield* Effect.promise(() => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
  return space;
});

/**
 * The Expando holding cross-space navtree ordering, created in the settings space if absent.
 *
 * Spaces are not typed objects and cannot be stored in a Collection, so the order is an array of
 * space ids.
 */
const ensureSpacesOrder = Effect.fnUntraced(function* (settingsSpace: Space, initialOrder: string[] = []) {
  const [existing] = yield* Effect.promise(() =>
    settingsSpace.db.query(Filter.type(Expando.Expando, { key: SpaceSchema.SHARED })).run(),
  );
  if (existing) {
    return existing;
  }

  try {
    return settingsSpace.db.add(Obj.make(Expando.Expando, { key: SpaceSchema.SHARED, order: initialOrder }));
  } catch (err) {
    // The space may have been destroyed (e.g. during test teardown) between the query and the add.
    log.warn('Failed to initialize spaces order, space may be closing', { err });
    return undefined;
  }
});

/** Read the `order` array off a legacy personal space's ordering Expando. */
const readLegacySpacesOrder = Effect.fnUntraced(function* (legacySpace: Space) {
  const [legacyOrder] = yield* Effect.promise(() =>
    legacySpace.db.query(Filter.type(Expando.Expando, { key: SpaceSchema.SHARED })).run(),
  );
  return ((legacyOrder as any)?.order as string[] | undefined) ?? [];
});

/**
 * One-time migration of app configuration out of the legacy personal space and into the settings
 * space: the cross-space ordering, the personal-space designation, and the space's display name
 * (which used to come from a translation because the space had no name of its own).
 *
 * Idempotent — every step is a no-op once the settings space already carries the value.
 */
export const migrateToSettingsSpace = Effect.fnUntraced(function* ({
  settingsSpace,
  legacySpace,
}: {
  settingsSpace: Space;
  legacySpace?: Space;
}) {
  if (legacySpace) {
    yield* Effect.promise(() => legacySpace.waitUntilReady());
  }

  const initialOrder = legacySpace ? yield* readLegacySpacesOrder(legacySpace) : [];
  yield* ensureSpacesOrder(settingsSpace, initialOrder);

  if (!legacySpace) {
    return;
  }

  if (!AppSpace.readPersonalSpaceId(settingsSpace)) {
    AppSpace.setPersonalSpaceId(settingsSpace, legacySpace.id);
  }

  if (!legacySpace.properties.name) {
    Obj.update(legacySpace.properties, (properties) => {
      properties.name = PERSONAL_SPACE_NAME;
    });
  }
});
