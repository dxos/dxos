//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Feed } from '@dxos/echo';
import { AccessToken, Cursor } from '@dxos/link';

import { AppGraphBuilder, Commands, CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';

import * as Connection from './types/Connection';

export const ConnectorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(Commands),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([AccessToken.AccessToken, Connection.Connection, Cursor.Cursor, Feed.Feed])),
  Plugin.make,
);

export default ConnectorPlugin;
