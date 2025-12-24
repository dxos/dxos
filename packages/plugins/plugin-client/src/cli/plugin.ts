//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';

import { Client, IntentResolver, SchemaDefs } from '../capabilities';
import { ClientEvents } from '../events';
import { meta } from '../meta';
import { type ClientPluginOptions } from '../types';

import { config, device, edge, halo, profile } from './commands';

// TODO(wittjosiah): Refactor capabilities to be able to use them without pulling in react.
export const ClientPlugin = definePlugin<ClientPluginOptions>(meta, (options) => [
  defineModule({
    id: `${meta.id}/module/client`,
    activatesOn: Events.Startup,
    activatesAfter: [ClientEvents.ClientReady],
    activate: (context) => Client({ ...options, context }),
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.ClientReady,
    activatesBefore: [ClientEvents.SetupSchema],
    activate: SchemaDefs,
  }),
  // TODO(wittjosiah): Could some of these commands make use of intents?
  defineModule({
    id: `${meta.id}/module/cli-commands`,
    activatesOn: Events.Startup,
    activate: () => [
      contributes(Capabilities.Command, config),
      contributes(Capabilities.Command, device),
      contributes(Capabilities.Command, edge),
      contributes(Capabilities.Command, halo),
      contributes(Capabilities.Command, profile),
    ],
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: (context) => IntentResolver({ context }),
  }),
]);
