//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Feed } from '@dxos/echo';
import { AccessToken, Cursor } from '@dxos/link';
import { ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, CreateObject, Migrations, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Connection } from '#types';

import { connector } from './commands';

export const ConnectorPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    // TODO(wittjosiah): Find a better place to fire this event.
    firesBeforeActivation: [AppActivationEvents.SetupConnectors],
    activate: AppGraphBuilder,
  }),
  AppPlugin.addCommandModule({ commands: [connector] }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [AccessToken.AccessToken, Connection.Connection, Cursor.Cursor, Feed.Feed],
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.SetupMigration,
    activate: Migrations,
  }),
  Plugin.make,
);

export default ConnectorPlugin;
