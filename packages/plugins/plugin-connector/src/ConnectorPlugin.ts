//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Feed } from '@dxos/echo';
import { ClientEvents } from '@dxos/plugin-client';
import { AccessToken, Cursor } from '@dxos/types';

import {
  AppGraphBuilder,
  BuiltinConnectors,
  Coordinator,
  CreateObject,
  Migrations,
  OAuthRedirect,
  OperationHandler,
  ReactSurface,
} from '#capabilities';
import { meta } from '#meta';
import { Connection, SyncBinding } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';
import { translations } from './translations';

export const ConnectorPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    // TODO(wittjosiah): Find a better place to fire this event.
    firesBeforeActivation: [AppActivationEvents.SetupConnectors],
    activate: AppGraphBuilder,
  }),
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
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupConnectors,
    activate: BuiltinConnectors,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ClientEvents.ClientReady, ActivationEvents.ProcessManagerReady),
    activate: Coordinator,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    activate: OAuthRedirect,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default ConnectorPlugin;
