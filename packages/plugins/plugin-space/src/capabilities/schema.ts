//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { SpaceCapabilities } from './capabilities';
import { type ObjectForm } from '../types';

export default (context: PluginsContext) => {
  const client = context.requestCapability(ClientCapabilities.Client);

  // TODO(wittjosiah): Unregister schemas when they are disabled.
  let previous: ObjectForm[] = [];
  const unsubscribe = effect(() => {
    const forms = Array.from(new Set(context.requestCapabilities(SpaceCapabilities.ObjectForm)));
    // TODO(wittjosiah): Filter out schemas which the client has already registered.
    const newSchemas = forms.filter((form) => !previous.includes(form)).map((form) => form.objectSchema);
    previous = forms;
    client.addTypes(newSchemas);
  });

  return contributes(Capabilities.Null, null, () => unsubscribe());
};
