//
// Copyright 2025 DXOS.org
//

import { Capability, Common, Plugin } from '@dxos/app-framework';

// NOTE: Must not import from index to avoid pulling in react dependencies.
import { Client } from '../capabilities/client';
import { OperationResolver } from '../capabilities/operation-resolver';
import { SchemaDefs } from '../capabilities/schema-defs';
import { ClientEvents } from '../events';
import { meta } from '../meta';
import { type ClientPluginOptions } from '../types';

import { config, device, edge, halo, profile } from './commands';

export const ClientPlugin = Plugin.define<ClientPluginOptions>(meta).pipe(
  Plugin.addModule((options) => ({
    id: Capability.getModuleTag(Client),
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [ClientEvents.ClientReady],
    activate: (context) => Client({ ...options, context }),
  })),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activatesBefore: [Common.ActivationEvent.SetupSchema],
    activate: SchemaDefs,
  }),
  // TODO(wittjosiah): Could some of these commands make use of operations?
  Common.Plugin.addCommandModule({ commands: [config, device, edge, halo, profile] }),
  Common.Plugin.addOperationResolverModule({ activate: (context) => OperationResolver({ context }) }),
  Plugin.make,
);
