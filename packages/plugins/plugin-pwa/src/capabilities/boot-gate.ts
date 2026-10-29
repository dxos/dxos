//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppUpdate from '@dxos/app-toolkit/AppUpdate';

import { PwaNamespace } from '../namespace.ts';
import { type PwaOptions, isAutoUpdateOn, settingsAtom } from '../settings-store.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* (options: PwaOptions) {
    const registry = yield* Capabilities.AtomRegistry;
    const manager = yield* AppCapabilities.UpdateManager;

    // With a worker but no controller this is a first visit: the install under way is the first
    // precache, not an update, and there is nothing older to replace.
    const controlled = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller;
    const enabled =
      (options.serviceWorker === false || controlled) && isAutoUpdateOn(registry.get(settingsAtom), options);

    const gate = AppUpdate.makeBootGate(registry, manager, enabled);
    yield* Effect.addFinalizer(() => Effect.sync(gate.dispose));

    return Capability.contribute(Capabilities.BootGate, { id: `${PwaNamespace.key}.auto-update`, state: gate.state });
  }),
);
