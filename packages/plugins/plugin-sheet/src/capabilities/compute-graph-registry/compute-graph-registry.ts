//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AutomationCapabilities } from '@dxos/plugin-automation';

import { SheetCapabilities } from '../../types';

// Locally declare the Automation ComputeRuntime capability by ID to avoid direct import dependency.

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const computeRuntimeResolver = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
    // TODO(wittjosiah): This can probably be a module level import now due to lazy capability loading.
    // Async import removes direct dependency on hyperformula.
    const { defaultPlugins, ComputeGraphRegistry } = yield* Effect.tryPromise(() => import('@dxos/compute'));
    const computeGraphRegistry = new ComputeGraphRegistry({
      plugins: defaultPlugins,
      computeRuntime: computeRuntimeResolver,
    });

    return Capability.contributes(SheetCapabilities.ComputeGraphRegistry, computeGraphRegistry);
  }),
);
