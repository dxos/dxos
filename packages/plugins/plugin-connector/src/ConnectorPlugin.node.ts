//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AccessToken } from '@dxos/types';

import { AppGraphBuilder, CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Connection, SyncBinding } from '#types';

import { connector } from './commands';

export const ConnectorPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    // TODO(wittjosiah): Find a better place to fire this event.
    firesBeforeActivation: [AppActivationEvents.SetupIntegrationProviders],
    activate: AppGraphBuilder,
  }),
  AppPlugin.addCommandModule({ commands: [connector] }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [AccessToken.AccessToken, Connection.Connection, SyncBinding.SyncBinding] }),
  Plugin.make,
);

export default ConnectorPlugin;
