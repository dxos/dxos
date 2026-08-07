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

import * as SpaceSchema from '../types/SpaceSchema';

/**
 * Find the settings space, creating it if the profile does not have one yet.
 *
 * Profiles created through {@link AppSpace.setupIdentitySpaces} already have one; this covers the
 * profiles that predate the settings space, whose first sight of it is the migration.
 */
export const ensureSettingsSpace = Effect.fnUntraced(function* (client: Client) {
  const existing = AppSpace.getSettingsSpace(client);
  if (existing) {
    yield* Effect.promise(() => existing.waitUntilReady());
    return existing;
  }

  const space = yield* Effect.promise(() =>
    client.spaces.create(
      { name: AppSpace.SETTINGS_SPACE_NAME },
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
export const ensureSpacesOrder = Effect.fnUntraced(function* (settingsSpace: Space) {
  const [existing] = yield* Effect.promise(() =>
    settingsSpace.db.query(Filter.type(Expando.Expando, { key: SpaceSchema.SHARED })).run(),
  );
  if (existing) {
    return existing;
  }

  return yield* Effect.try(() =>
    settingsSpace.db.add(Obj.make(Expando.Expando, { key: SpaceSchema.SHARED, order: [] })),
  ).pipe(
    // The space may have been destroyed (e.g. during test teardown) between the query and the add.
    Effect.catchAll((err) =>
      Effect.sync(() => log.warn('Failed to initialize spaces order, space may be closing', { err })),
    ),
  );
});

/** Read the persisted cross-space ordering out of a space, or `[]` when it has none. */
export const readSpacesOrder = Effect.fnUntraced(function* (space: Space) {
  const [ordering] = yield* Effect.promise(() =>
    space.db.query(Filter.type(Expando.Expando, { key: SpaceSchema.SHARED })).run(),
  );

  // Expando is untyped by construction, so the persisted shape is validated rather than asserted.
  const order: unknown = ordering && (ordering as Record<string, unknown>).order;
  return Array.isArray(order) ? order.filter((id): id is string => typeof id === 'string') : [];
});
