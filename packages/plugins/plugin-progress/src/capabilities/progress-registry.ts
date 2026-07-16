//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, createProgressRegistry } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { Progress } from '@dxos/progress';

/**
 * Contributes the always-on {@link AppCapabilities.ProgressRegistry}. Built from the shared atom
 * registry so any plugin can register/subscribe to progress providers.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    return [Capability.provide(AppCapabilities.ProgressRegistry, createProgressRegistry(registry))];
  }),
);
