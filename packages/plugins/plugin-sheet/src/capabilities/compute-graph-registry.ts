//
// Copyright 2025 DXOS.org
//

import { type PluginContext, contributes } from '@dxos/app-framework';
import { AutomationCapabilities } from '@dxos/plugin-automation';

import { SheetCapabilities } from './capabilities';

// Locally declare the Automation ComputeRuntime capability by ID to avoid direct import dependency.

export default async (context: PluginContext) => {
  // TODO(wittjosiah): This can probably be a module level import now due to lazy capability loading.
  // Async import removes direct dependency on hyperformula.
  const { defaultPlugins, ComputeGraphRegistry } = await import('@dxos/compute');
  const computeRuntimeResolver = context.getCapability(AutomationCapabilities.ComputeRuntime);

  const computeGraphRegistry = new ComputeGraphRegistry({
    plugins: defaultPlugins,
    computeRuntime: computeRuntimeResolver,
  });
  return contributes(SheetCapabilities.ComputeGraphRegistry, computeGraphRegistry);
};
