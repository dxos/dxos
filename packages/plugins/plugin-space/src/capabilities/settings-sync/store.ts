//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';

import { type Store } from './binding';

/**
 * The space's {@link AppSettings.AppSettings} singleton, created on first use.
 *
 * Two devices racing first use create two objects; the lowest id wins so every device converges on
 * the same one rather than each following its own.
 */
export const getOrCreateSettings = Effect.fnUntraced(function* (space: Space) {
  const existing = yield* Effect.promise(() => space.db.query(Filter.type(AppSettings.AppSettings)).run());
  const canonical = [...existing].sort((left, right) => left.id.localeCompare(right.id))[0];
  return canonical ?? space.db.add(AppSettings.make());
});

/** Adapt an ECHO settings object to the reconciler's storage interface. */
export const makeStore = (settings: AppSettings.AppSettings): Store => ({
  read: () => settings,
  update: (fn) => {
    Obj.update(settings, fn);
  },
});
