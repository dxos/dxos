//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AccessToken } from '@dxos/types';

import { AppGraphBuilder, CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Integration } from '#types';

import { integration } from './commands';

export const IntegrationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    // TODO(wittjosiah): Find a better place to fire this event.
    firesBeforeActivation: [AppActivationEvents.SetupIntegrationProviders],
    activate: AppGraphBuilder,
  }),
  AppPlugin.addCommandModule({ commands: [integration] }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [AccessToken.AccessToken, Integration.Integration] }),
  Plugin.make,
);

export default IntegrationPlugin;
