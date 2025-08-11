//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { type Type } from '@dxos/echo';

import { ClientCapabilities } from './capabilities';

export default (context: PluginContext) => {
  const registry = context.getCapability(Capabilities.RxRegistry);
  const client = context.getCapability(ClientCapabilities.Client);

  // TODO(wittjosiah): Unregister schemas when they are disabled.
  let previous: Type.Obj.Any[] = [];
  const cancel = registry.subscribe(
    context.capabilities(ClientCapabilities.Schema),
    (_schemas) => {
      const schemas = Array.from(new Set(_schemas.flat()));
      // TODO(wittjosiah): Filter out schemas which the client has already registered.
      const newSchemas = schemas.filter((schema) => !previous.includes(schema));
      previous = schemas;
      client.addTypes(newSchemas);
    },
    { immediate: true },
  );

  return contributes(Capabilities.Null, null, () => cancel());
};
