//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { Client, LayerSpecs, Migrations, OperationHandler, SchemaDefs } from '#capabilities';
import { meta } from '#meta';
import { type ClientPluginOptions } from '#types';

import { account, config, device, edge, halo, profile } from './commands';

export const ClientPlugin = Plugin.define<ClientPluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of operations?
  Plugin.addModule(AppCapability.commands([account, config, device, edge, halo, profile])),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Client),
  Plugin.addModule(SchemaDefs),
  Plugin.addModule(Migrations),
  Plugin.addModule(LayerSpecs),
  Plugin.make,
);

export default ClientPlugin;
