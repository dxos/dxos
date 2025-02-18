//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { type TypedObject } from '@dxos/echo-schema';

import { ClientCapabilities } from './capabilities';

// TODO(wittjosiah): Remove types?
export default (context: PluginsContext) => {
  const client = context.requestCapability(ClientCapabilities.Client);

  let previousSystem: TypedObject[] = [];
  const unsubscribeSystem = effect(() => {
    const systemSchemas = Array.from(new Set(context.requestCapabilities(ClientCapabilities.SystemSchema).flat()));
    const newSchemas = systemSchemas.filter((schema) => !previousSystem.includes(schema));
    previousSystem = systemSchemas;
    client.addTypes(newSchemas);
  });

  let previous: TypedObject[] = [];
  const unsubscribe = effect(() => {
    const schemas = Array.from(new Set(context.requestCapabilities(ClientCapabilities.Schema).flat()));
    const newSchemas = schemas.filter((schema) => !previous.includes(schema));
    previous = schemas;
    client.addTypes(newSchemas);
  });

  return contributes(Capabilities.Null, null, () => {
    unsubscribeSystem();
    unsubscribe();
  });
};
