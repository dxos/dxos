//
// Copyright 2025 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { Client, LayerSpecs, Migrations, OperationHandler, SchemaDefs } from '#capabilities';
import { meta } from '#meta';
import { ClientEvents } from '#types';
import { type ClientPluginOptions } from '#types';

import { account, config, device, edge, halo, profile } from './commands';

export const ClientPlugin = Plugin.define<ClientPluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of operations?
  AppPlugin.addCommandModule({ commands: [account, config, device, edge, halo, profile] }),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addModule((options) => ({
    id: Capability.getModuleTag(Client),
    requires: Client.requires,
    provides: Client.provides,
    // Migration bridge for unmigrated ClientReady listeners.
    compatFires: [ClientEvents.ClientReady],
    activate: () => Client(options),
  })),
  Plugin.addLazyModule(SchemaDefs, { compatFires: [AppActivationEvents.SetupSchema] }),
  Plugin.addLazyModule(Migrations, { compatFires: [ClientEvents.SetupMigration] }),
  Plugin.addLazyModule(LayerSpecs),
  Plugin.make,
);

export default ClientPlugin;
