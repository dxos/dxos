//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AutomationCapabilities } from '@dxos/plugin-automation';

import { SheetCapabilities } from '../../types';

// Locally declare the Automation ComputeRuntime capability by ID to avoid direct import dependency.

export default Capability.makeModule(async (context: Capability.PluginContext) => {
  // TODO(wittjosiah): This can probably be a module level import now due to lazy capability loading.
  // Async import removes direct dependency on hyperformula.
  const { defaultPlugins, ComputeGraphRegistry } = await import('@dxos/compute');
  const computeRuntimeResolver = context.getCapability(AutomationCapabilities.ComputeRuntime);
  const computeGraphRegistry = new ComputeGraphRegistry({
    plugins: defaultPlugins,
    computeRuntime: computeRuntimeResolver,
  });

  return Capability.contributes(SheetCapabilities.ComputeGraphRegistry, computeGraphRegistry);
});
