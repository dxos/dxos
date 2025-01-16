//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginsContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { SheetCapabilities } from './capabilities';

export default async (context: PluginsContext) => {
  const client = context.requestCapability(ClientCapabilities.Client);
  let remoteFunctionUrl: string | undefined;
  if (client.config.values.runtime?.services?.edge?.url) {
    const url = new URL('/functions', client.config.values.runtime?.services?.edge?.url);
    url.protocol = 'https';
    remoteFunctionUrl = url.toString();
  }

  // TODO(wittjosiah): This can probably be a module level import now due to lazy capability loading.
  // Async import removes direct dependency on hyperformula.
  const { defaultPlugins, ComputeGraphRegistry } = await import('@dxos/compute');
  const computeGraphRegistry = new ComputeGraphRegistry({ plugins: defaultPlugins, remoteFunctionUrl });

  return contributes(SheetCapabilities.ComputeGraphRegistry, computeGraphRegistry);
};
