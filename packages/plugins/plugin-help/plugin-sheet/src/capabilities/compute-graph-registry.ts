//
// Copyright 2025 DXOS.org
//

import { type PluginContext, contributes } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { SheetCapabilities } from './capabilities';

const isSecure = (protocol: string) => {
  return protocol === 'https:' || protocol === 'wss:';
};

export default async (context: PluginContext) => {
  const client = context.getCapability(ClientCapabilities.Client);
  let remoteFunctionUrl: string | undefined;
  if (client.config.values.runtime?.services?.edge?.url) {
    const url = new URL('/functions', client.config.values.runtime?.services?.edge?.url);
    url.protocol = isSecure(url.protocol) ? 'https' : 'http';
    remoteFunctionUrl = url.toString();
  }

  // TODO(wittjosiah): This can probably be a module level import now due to lazy capability loading.
  // Async import removes direct dependency on hyperformula.
  const { defaultPlugins, ComputeGraphRegistry } = await import('@dxos/compute');
  const computeGraphRegistry = new ComputeGraphRegistry({ plugins: defaultPlugins, remoteFunctionUrl });
  return contributes(SheetCapabilities.ComputeGraphRegistry, computeGraphRegistry);
};
