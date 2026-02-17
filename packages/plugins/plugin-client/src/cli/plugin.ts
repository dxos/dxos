//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

// NOTE: Must not import from index to avoid pulling in react dependencies.
import { Client } from '../capabilities/client';
import { OperationResolver } from '../capabilities/operation-resolver';
import { SchemaDefs } from '../capabilities/schema-defs';
import { meta } from '../meta';
import { ClientEvents } from '../types';
import { type ClientPluginOptions } from '../types';

import { config, device, edge, halo, profile } from './commands';

export const ClientPlugin = Plugin.define<ClientPluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of operations?
  AppPlugin.addCommandModule({ commands: [config, device, edge, halo, profile] }),
  AppPlugin.addOperationResolverModule({ activate: () => OperationResolver() }),
  Plugin.addModule((options) => ({
    id: Capability.getModuleTag(Client),
    activatesOn: ActivationEvents.Startup,
    activatesAfter: [ClientEvents.ClientReady],
    activate: () => Client(options),
  })),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activatesBefore: [AppActivationEvents.SetupSchema],
    activate: SchemaDefs,
  }),
  Plugin.make,
);
