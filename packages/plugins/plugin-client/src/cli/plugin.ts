//
// Copyright 2025 DXOS.org
//

import { Common, Plugin } from '@dxos/app-framework';

// NOTE: Must not import from index to avoid pulling in react dependencies.
import { Client } from '../capabilities/client';
import { IntentResolver } from '../capabilities/intent-resolver';
import { SchemaDefs } from '../capabilities/schema-defs';
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
    activatesBefore: [Common.ActivationEvent.SetupSchema],
    activate: SchemaDefs,
  }),
  // TODO(wittjosiah): Could some of these commands make use of intents?
  Common.Plugin.addCommandModule({
    id: `${meta.id}/module/cli-commands`,
    commands: [config, device, edge, halo, profile],
  }),
  Plugin.addModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: (context) => IntentResolver({ context }),
  }),
  Plugin.make,
);

Object.assign(ClientPlugin, { meta });
