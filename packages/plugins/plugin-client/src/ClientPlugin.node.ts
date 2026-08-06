//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { Client, LayerSpecs, Migrations, OperationHandler, SchemaDefs } from '#capabilities';
import { meta } from '#meta';

import * as ClientOptions from './types/ClientOptions';

export const ClientPlugin = Plugin.define<ClientOptions.ClientPluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of operations?
  Plugin.addModule(AppCapability.commands(() => import('./capabilities/commands.node'))),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Client),
  Plugin.addModule(SchemaDefs),
  Plugin.addModule(Migrations),
  Plugin.addModule(LayerSpecs),
  Plugin.make,
);

export default ClientPlugin;
