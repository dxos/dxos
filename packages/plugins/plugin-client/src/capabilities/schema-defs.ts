//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { type Type } from '@dxos/echo';

import { ClientCapabilities } from '../types';

export default Capability.makeModule((context) => {
  const registry = context.getCapability(Capabilities.AtomRegistry);
  const client = context.getCapability(ClientCapabilities.Client);

  // TODO(wittjosiah): Unregister schemas when they are disabled.
  let previous: Type.Entity.Any[] = [];
  const cancel = registry.subscribe(
    context.capabilities(ClientCapabilities.Schema),
    async (_schemas: any[]) => {
      // TODO(wittjosiah): This doesn't seem to de-dupe schemas as expected.
      const schemas = Array.from(new Set(_schemas.flat())) as Type.Entity.Any[];
      // TODO(wittjosiah): Filter out schemas which the client has already registered.
      const newSchemas = schemas.filter((schema) => !previous.includes(schema));
      previous = schemas;
      await client.addTypes(newSchemas);
    },
    { immediate: true },
  );

  return Capability.contributes(Capabilities.Null, null, () => cancel());
});
