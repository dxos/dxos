//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Space, SpaceState } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Expando } from '@dxos/schema';

import { SpaceSchema } from '#types';

/**
 * Move app configuration out of the legacy personal space and into the settings space: the
 * cross-space ordering, the default-space designation, and the space's display name (which used to
 * come from a translation because the space had no name of its own).
 *
 * Idempotent — every step is a no-op once the settings space already carries the value — so it is
 * safe to re-run when a legacy space is discovered after the settings space, or migrated later.
 */
export const migrateToSettingsSpace = Effect.fnUntraced(function* ({
  settingsSpace,
  legacySpace,
}: {
  settingsSpace: Space;
  legacySpace?: Space;
}) {
  const ordering = yield* ensureSpacesOrder(settingsSpace);
  // A legacy space awaiting SDK migration never opens, so defer rather than wait on it: the user
  // migrates it like any other space, and the resulting state change re-runs this.
  if (!legacySpace || legacySpace.state.get() !== SpaceState.SPACE_READY) {
    return;
  }

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

/** Whether an object is the cross-space ordering Expando. Pairs with {@link readSpacesOrder}. */
export const isSpacesOrder = (object: Obj.Unknown): boolean =>
  Obj.instanceOf(Expando.Expando, object) && object.key === SpaceSchema.SHARED;

/**
 * Fold a duplicate settings space's cross-space ordering into the canonical one before the
 * duplicate is removed: ids the canonical ordering already carries keep their position, ids only
 * the duplicate knows are appended, so no space drops out of the navtree when its entry lived in
 * the losing copy.
 *
 * @returns Whether the duplicate's ordering is now carried by the canonical space. False means the
 * merge could not run (e.g. the canonical is closing) — the caller must keep the duplicate, since
 * deleting it would destroy the only copy of its ordering.
 */
export const mergeSpacesOrder = Effect.fnUntraced(function* (canonical: Space, duplicate: Space) {
  const duplicateOrder = yield* readSpacesOrder(duplicate);
  if (duplicateOrder.length === 0) {
    return true;
  }

  // `ensureSpacesOrder` swallows a closing-canonical failure into `undefined`; with an order left
  // to carry that must read as "not merged", never as done.
  const ordering = yield* ensureSpacesOrder(canonical);
  if (!ordering) {
    return false;
  }

  const canonicalOrder = yield* readSpacesOrder(canonical);
  const missing = duplicateOrder.filter((id) => !canonicalOrder.includes(id));
  if (missing.length > 0) {
    writeSpacesOrder(ordering, [...canonicalOrder, ...missing]);
  }
  return true;
});

/** A destroyed or closing space rejects writes; anything else is a real database failure. */
const isSpaceClosingError = (err: unknown): boolean =>
  /clos|destroy/i.test(err instanceof Error ? err.message : String(err));
