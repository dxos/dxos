//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';
import { AccessToken } from '@dxos/types';

import {
  AppGraphBuilder,
  BuiltinProviders,
  Coordinator,
  CreateObject,
  OAuthRedirect,
  OperationHandler,
  ReactSurface,
} from '#capabilities';
import { meta } from '#meta';
import { Integration } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';
import { translations } from './translations';

export const IntegrationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    // TODO(wittjosiah): Find a better place to fire this event.
    firesBeforeActivation: [AppActivationEvents.SetupIntegrationProviders],
    activate: AppGraphBuilder,
  }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [AccessToken.AccessToken, Integration.Integration] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupIntegrationProviders,
    activate: BuiltinProviders,
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
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default IntegrationPlugin;
