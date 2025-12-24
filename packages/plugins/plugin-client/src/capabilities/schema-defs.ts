//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { type Type } from '@dxos/echo';

import { ClientCapabilities } from '../types';

export default defineCapabilityModule((context: PluginContext) => {
  const registry = context.getCapability(Capabilities.AtomRegistry);
  const client = context.getCapability(ClientCapabilities.Client);

  // TODO(wittjosiah): Unregister schemas when they are disabled.
  let previous: Type.Entity.Any[] = [];
  const cancel = registry.subscribe(
    context.capabilities(ClientCapabilities.Schema),
    async (_schemas) => {
      // TODO(wittjosiah): This doesn't seem to de-dupe schemas as expected.
      const schemas = Array.from(new Set(_schemas.flat()));
      // TODO(wittjosiah): Filter out schemas which the client has already registered.
      const newSchemas = schemas.filter((schema) => !previous.includes(schema));
      previous = schemas;
      await client.addTypes(newSchemas);
    },
    { immediate: true },
  );

  return contributes(Capabilities.Null, null, () => cancel());
});
