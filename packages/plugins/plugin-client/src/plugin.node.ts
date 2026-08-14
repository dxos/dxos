//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Client, Commands, LayerSpecs, Migrations, OperationHandler, SchemaDefs } from '#capabilities';
import { meta } from '#meta';
import { ClientOptions } from '#types';

export const ClientPlugin = Plugin.define<ClientOptions.ClientPluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of operations?
  Plugin.addModule(Commands),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Client),
  Plugin.addModule(SchemaDefs),
  Plugin.addModule(Migrations),
  Plugin.addModule(LayerSpecs),
  Plugin.make,
);

export default ClientPlugin;
