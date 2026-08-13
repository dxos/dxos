//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { AppGraphBuilder, Commands, CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const ConnectorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(Commands),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema(() => import('./schema'))),
  Plugin.make,
);

export default ConnectorPlugin;
