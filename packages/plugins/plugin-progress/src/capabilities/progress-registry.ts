//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { createProgressRegistry } from '@dxos/app-toolkit';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

/**
 * Contributes the always-on {@link AppCapabilities.ProgressRegistry}. Built from the shared atom
 * registry so any plugin can register/subscribe to progress providers.
 */
export default Capability.makeModule(Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    return [Capability.contribute(AppCapabilities.ProgressRegistry, createProgressRegistry(registry))];
  }),
);
