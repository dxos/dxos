//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Feed } from '@dxos/echo';
import { AccessToken, Cursor } from '@dxos/link';

import { AppGraphBuilder, CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Connection } from '#types';

import { connector } from './commands';

export const ConnectorPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addCommandModule({ commands: [connector] }),
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({
    schema: [AccessToken.AccessToken, Connection.Connection, Cursor.Cursor, Feed.Feed],
  }),
  Plugin.make,
);

export default ConnectorPlugin;
