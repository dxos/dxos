//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { AppGraphBuilder, Commands, CreateObject, OperationHandler, RoutineTemplate, Schema } from '#capabilities';
import { meta } from '#meta';

export const ConnectorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(Commands),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(RoutineTemplate),
  Plugin.addModule(Schema),
  Plugin.make,
);

export default ConnectorPlugin;
