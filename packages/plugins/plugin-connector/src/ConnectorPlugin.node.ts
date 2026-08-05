//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Feed } from '@dxos/echo';
import { AccessToken, Cursor } from '@dxos/link';

import { AppGraphBuilder, CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Connection } from '#types';

import { connector } from './commands';

export const ConnectorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(AppCapability.commands([connector])),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([AccessToken.AccessToken, Connection.Connection, Cursor.Cursor, Feed.Feed])),
  Plugin.make,
);

export default ConnectorPlugin;
