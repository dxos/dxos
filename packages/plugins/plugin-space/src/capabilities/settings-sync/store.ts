//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { createKvsStore } from '@dxos/effect';

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

/**
 * This device's own layer, in local storage.
 *
 * Keyed by device key so a profile joined to a different identity on the same browser starts clean,
 * which is what the per-device entry in ECHO used to give for free.
 */
export const makeDeviceStore = (deviceKey: string): Atom.Writable<AppSettings.DeviceSettings> =>
  createKvsStore({
    key: `org.dxos.app-toolkit.settings-scope/${deviceKey}`,
    schema: AppSettings.DeviceSettings,
    defaultValue: AppSettings.makeDeviceSettings,
  });

/**
 * Adapt the two halves to the reconciler's storage interface: the shared layer in ECHO, this
 * device's own in local storage.
 *
 * A write opens both, since a single edit routes to one layer or the other and only
 * {@link AppSettings.setValue} knows which. The local half is copied out, mutated and written back,
 * because the atom compares by identity and would not notify on an in-place change.
 */
export const makeStore = (
  settings: AppSettings.AppSettings,
  device: Atom.Writable<AppSettings.DeviceSettings>,
  registry: AtomRegistry.AtomRegistry,
): Store => ({
  read: () => ({ shared: settings.shared, local: registry.get(device) }),
  update: (fn) => {
    const before = registry.get(device);
    const local: AppSettings.DeviceSettings = {
      overrides: structuredClone(before.overrides),
      unsynced: [...before.unsynced],
    };
    Obj.update(settings, (draft) => fn({ shared: draft.shared, local }));
    // Only republish when this half actually moved: an edit routed to the shared layer leaves it
    // untouched, and setting it regardless would wake every reader on every write.
    if (JSON.stringify(local) !== JSON.stringify(before)) {
      registry.set(device, local);
    }
  },
});
