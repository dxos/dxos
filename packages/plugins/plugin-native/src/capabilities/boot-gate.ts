//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppUpdate from '@dxos/app-toolkit/AppUpdate';

import { NativeCapabilities } from '#types';

import { NativeNamespace } from '../namespace.ts';
import { type NativeOptions, isAutoUpdateOn, settingsAtom } from '../settings-store.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* (options: NativeOptions) {
    const registry = yield* Capabilities.AtomRegistry;
    const manager = yield* NativeCapabilities.UpdateManager;

    const gate = AppUpdate.makeBootGate(registry, manager, isAutoUpdateOn(registry.get(settingsAtom), options));
    yield* Effect.addFinalizer(() => Effect.sync(gate.dispose));

    return Capability.contribute(Capabilities.BootGate, {
      id: `${NativeNamespace.key}.auto-update`,
      state: gate.state,
    });
  }),
);
