//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { Client, LayerSpecs, Migrations, OperationHandler, SchemaDefs } from '#capabilities';
import { meta } from '#meta';
import { ClientEvents } from '#types';
import { type ClientPluginOptions } from '#types';

import { config, device, edge, halo, profile } from './commands';

export const ClientPlugin = Plugin.define<ClientPluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of operations?
  AppPlugin.addCommandModule({ commands: [config, device, edge, halo, profile] }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  Plugin.addModule((options) => ({
    id: Capability.getModuleTag(Client),
    activatesOn: ActivationEvents.Startup,
    firesAfterActivation: [ClientEvents.ClientReady],
    activate: () => Client(options),
  })),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    firesBeforeActivation: [AppActivationEvents.SetupSchema],
    activate: SchemaDefs,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    firesBeforeActivation: [ClientEvents.SetupMigration],
    activate: Migrations,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: LayerSpecs,
  }),
  Plugin.make,
);

export default ClientPlugin;
