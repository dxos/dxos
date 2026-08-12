//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Feed } from '@dxos/echo';
import { AccessToken, Connection, Cursor } from '@dxos/link';

import { AppGraphBuilder, Commands, CreateObject, OperationHandler, RoutineTemplate } from '#capabilities';
import { meta } from '#meta';

export const ConnectorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(Commands),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(RoutineTemplate),
  Plugin.addModule(AppCapability.schema([AccessToken.AccessToken, Connection.Connection, Cursor.Cursor, Feed.Feed])),
  Plugin.make,
);

export default ConnectorPlugin;
