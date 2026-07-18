//
// Copyright 2025 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { Client, LayerSpecs, Migrations, OperationHandler, SchemaDefs } from '#capabilities';
import { meta } from '#meta';
import { type ClientPluginOptions } from '#types';

import { account, config, device, edge, halo, profile } from './commands';

export const ClientPlugin = Plugin.define<ClientPluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of operations?
  AppPlugin.addCommandModule<ClientPluginOptions>({ commands: [account, config, device, edge, halo, profile] }),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addModule((options: ClientPluginOptions) => ({
    id: Capability.getModuleTag(Client),
    requires: Client.requires,
    provides: Client.provides,
    activate: () => Client(options),
  })),
  Plugin.addLazyModule(SchemaDefs),
  Plugin.addLazyModule(Migrations),
  Plugin.addLazyModule(LayerSpecs),
  Plugin.make,
);

export default ClientPlugin;
