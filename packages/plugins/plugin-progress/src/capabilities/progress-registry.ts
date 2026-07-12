//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, createProgressRegistry } from '@dxos/app-toolkit';

/**
 * Contributes the always-on {@link AppCapabilities.ProgressRegistry}. Built from the shared atom
 * registry so any plugin can register/subscribe to progress providers.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    return Capability.contributes(AppCapabilities.ProgressRegistry, createProgressRegistry(registry));
  }),
);
