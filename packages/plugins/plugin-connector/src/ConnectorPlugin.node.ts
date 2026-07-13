//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Feed } from '@dxos/echo';
import { ClientEvents } from '@dxos/plugin-client';
import { AccessToken, Cursor } from '@dxos/types';

import { AppGraphBuilder, CreateObject, Migrations, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Connection, SyncBinding } from '#types';

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
    schema: [
      AccessToken.AccessToken,
      Connection.Connection,
      Cursor.Cursor,
      Feed.Feed,
      SyncBinding.SyncBinding,
      // Registered so the 0.1.0 → 0.2.0 migration can decode legacy bindings.
      SyncBinding.SyncBindingV1,
    ],
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.SetupMigration,
    activate: Migrations,
  }),
  Plugin.make,
);

export default ConnectorPlugin;
