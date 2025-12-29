//
// Copyright 2025 DXOS.org
//

import { Capability, Common, Plugin } from '@dxos/app-framework';

import { Client, IntentResolver, SchemaDefs } from '../capabilities';
import { ClientEvents } from '../events';
import { meta } from '../meta';
import { type ClientPluginOptions } from '../types';

import { config, device, edge, halo, profile } from './commands';

// TODO(wittjosiah): Refactor capabilities to be able to use them without pulling in react.
export const ClientPlugin = Plugin.define<ClientPluginOptions>(meta).pipe(
  Plugin.addModule((options) => ({
    id: `${meta.id}/module/client`,
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [ClientEvents.ClientReady],
    activate: (context) => Client({ ...options, context }),
  })),
  Plugin.addModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.ClientReady,
    activatesBefore: [ClientEvents.SetupSchema],
    activate: SchemaDefs,
  }),
  // TODO(wittjosiah): Could some of these commands make use of intents?
  Plugin.addModule({
    id: `${meta.id}/module/cli-commands`,
    activatesOn: Common.ActivationEvent.Startup,
    activate: () => [
      Capability.contributes(Common.Capability.Command, config),
      Capability.contributes(Common.Capability.Command, device),
      Capability.contributes(Common.Capability.Command, edge),
      Capability.contributes(Common.Capability.Command, halo),
      Capability.contributes(Common.Capability.Command, profile),
    ],
  }),
  Plugin.addModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: (context) => IntentResolver({ context }),
  }),
  Plugin.make,
);

Object.assign(ClientPlugin, { meta });
