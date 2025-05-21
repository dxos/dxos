//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginContext } from '@dxos/app-framework';
import { type TypedObject } from '@dxos/echo-schema';

import { ClientCapabilities } from './capabilities';

export default (context: PluginContext) => {
  const registry = context.getCapability(Capabilities.RxRegistry);
  const client = context.getCapability(ClientCapabilities.Client);

  // TODO(wittjosiah): Unregister schemas when they are disabled.
  let previous: TypedObject[] = [];
  const cancel = registry.subscribe(context.capabilities(ClientCapabilities.Schema), (_schemas) => {
    const schemas = Array.from(new Set(_schemas.flat()));
    // TODO(wittjosiah): Filter out schemas which the client has already registered.
    const newSchemas = schemas.filter((schema) => !previous.includes(schema));
    previous = schemas;
    client.addTypes(newSchemas);
  });
  // TODO(wittjosiah): This is currently required to initialize the above subscription.
  registry.get(context.capabilities(ClientCapabilities.Schema));

  return contributes(Capabilities.Null, null, () => cancel());
};
