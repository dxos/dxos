//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';

import { ClientCapabilities } from './capabilities';

export default (context: PluginsContext) => {
  const client = context.requestCapability(ClientCapabilities.Client);

  // TODO(wittjosiah): This should subscribe to capabilities and add types for newly added capabilities.
  const systemSchemas = Array.from(new Set(context.requestCapabilities(ClientCapabilities.SystemSchema).flat()));
  const schemas = Array.from(new Set(context.requestCapabilities(ClientCapabilities.Schema).flat()));
  client.addTypes(systemSchemas);
  client.addTypes(schemas);

  return contributes(Capabilities.Null, null);
};
