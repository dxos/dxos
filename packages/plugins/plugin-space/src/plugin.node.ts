//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { Commands, CreateObject, IdentityCreated, OperationHandler, UndoMappings } from '#capabilities';
import { meta } from '#meta';
import { SpaceSchema } from '#types';

export const SpacePlugin = Plugin.define<SpaceSchema.SpacePluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of operations?
  Plugin.addModule(Commands),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema(() => import('./schema.node'))),
  Plugin.addModule(UndoMappings),
  Plugin.addModule(IdentityCreated),
  Plugin.make,
);

export default SpacePlugin;
