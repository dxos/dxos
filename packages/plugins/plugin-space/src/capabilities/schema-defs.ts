//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { SpaceCapabilities } from './capabilities';
import { type ObjectForm } from '../types';

export default (context: PluginContext) => {
  const registry = context.getCapability(Capabilities.RxRegistry);
  const client = context.getCapability(ClientCapabilities.Client);

  // TODO(wittjosiah): Unregister schemas when they are disabled.
  let previous: ObjectForm[] = [];
  const cancel = registry.subscribe(
    context.capabilities(SpaceCapabilities.ObjectForm),
    (_forms) => {
      const forms = Array.from(new Set(_forms));
      // TODO(wittjosiah): Filter out schemas which the client has already registered.
      const newSchemas = forms.filter((form) => !previous.includes(form)).map((form) => form.objectSchema);
      previous = forms;
      client.addTypes(newSchemas);
    },
    { immediate: true },
  );

  return contributes(Capabilities.Null, null, () => cancel());
};
