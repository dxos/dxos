//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { type TypedObject } from '@dxos/echo-schema';

import { ClientCapabilities } from './capabilities';

export default (context: PluginsContext) => {
  const client = context.requestCapability(ClientCapabilities.Client);

  // TODO(wittjosiah): Unregister schemas when they are disabled.
  let previous: TypedObject[] = [];
  const unsubscribe = effect(() => {
    const schemas = Array.from(new Set(context.requestCapabilities(ClientCapabilities.Schema).flat()));
    // TODO(wittjosiah): Filter out schemas which the client has already registered.
    const newSchemas = schemas.filter((schema) => !previous.includes(schema));
    previous = schemas;
    client.addTypes(newSchemas);
  });

  return contributes(Capabilities.Null, null, () => unsubscribe());
};
