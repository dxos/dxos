//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Expando } from '@dxos/schema';

import * as SpaceSchema from '../types/SpaceSchema';

/**
 * Move app configuration out of the legacy personal space and into the settings space: the
 * cross-space ordering, the default-space designation, and the space's display name (which used to
 * come from a translation because the space had no name of its own).
 *
 * Idempotent — every step is a no-op once the settings space already carries the value — so it is
 * safe to re-run when a legacy space is discovered after the settings space.
 */
export const migrateToSettingsSpace = Effect.fnUntraced(function* ({
  settingsSpace,
  legacySpace,
}: {
  settingsSpace: Space;
  legacySpace?: Space;
}) {
  const ordering = yield* ensureSpacesOrder(settingsSpace);
  if (!legacySpace) {
    return;
  }

  yield* Effect.promise(() => legacySpace.waitUntilReady());

  // An earlier pass may have created the ordering before the legacy space resolved, so transfer
  // into an empty one rather than treating its existence as proof the migration already ran.
  const legacyOrder = yield* readSpacesOrder(legacySpace);
  if (ordering && legacyOrder.length > 0 && (yield* readSpacesOrder(settingsSpace)).length === 0) {
    writeSpacesOrder(ordering, legacyOrder);
  }

  if (!AppSpace.getDefaultSpaceId(settingsSpace)) {
    AppSpace.setDefaultSpaceId(settingsSpace, legacySpace.id);
  }

  if (!legacySpace.properties.name) {
    Obj.update(legacySpace.properties, (properties) => {
      properties.name = AppSpace.DEFAULT_SPACE_NAME;
    });
  }
});

/**
 * The Expando holding cross-space navtree ordering, created in the settings space if absent.
 *
 * Spaces are not typed objects and cannot be stored in a Collection, so the order is an array of
 * space ids.
 */
const ensureSpacesOrder = Effect.fnUntraced(function* (settingsSpace: Space) {
  const existing = yield* findSpacesOrder(settingsSpace);
  if (existing) {
    return existing;
  }

  return yield* Effect.try(() =>
    settingsSpace.db.add(Obj.make(Expando.Expando, { key: SpaceSchema.SHARED, order: [] })),
  ).pipe(
    // Only a closing space is expected (e.g. test teardown between the query and the add); any
    // other failure means the ordering did not persist and must not read to the migration as done.
    Effect.catchIf(isSpaceClosingError, (err) =>
      Effect.sync(() => log.warn('Failed to initialize spaces order, space may be closing', { err })),
    ),
  );
});

/** The ordering Expando held by a space, or `undefined` when it has none. */
const findSpacesOrder = Effect.fnUntraced(function* (space: Space) {
  const [ordering] = yield* Effect.promise(() =>
    space.db.query(Filter.type(Expando.Expando, { key: SpaceSchema.SHARED })).run(),
  );
  return ordering;
});

/**
 * Read the persisted cross-space ordering, or `[]` when absent.
 * This and {@link writeSpacesOrder} are the only places that know the Expando's shape. Expando
 * properties are `any` by construction, so the persisted value is validated rather than trusted.
 */
export const readSpacesOrder = Effect.fnUntraced(function* (space: Space) {
  const ordering = yield* findSpacesOrder(space);
  const order: unknown = ordering?.order;
  return Array.isArray(order) ? order.filter((id): id is string => typeof id === 'string') : [];
});

/** Overwrite the ordering held by an ordering Expando. Pairs with {@link readSpacesOrder}. */
const writeSpacesOrder = (ordering: Expando.Expando, order: readonly string[]): void => {
  Obj.update(ordering, (ordering) => {
    ordering.order = [...order];
  });
};

/** A destroyed or closing space rejects writes; anything else is a real database failure. */
const isSpaceClosingError = (err: unknown): boolean =>
  /clos|destroy/i.test(err instanceof Error ? err.message : String(err));
