//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { AppGraphBuilder, IntegrationProvider, OperationHandler } from '#capabilities';
import { meta } from '#meta';

import { translations } from './translations';

export const TrelloPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupIntegrationProviders,
    activate: IntegrationProvider,
  }),
  Plugin.make,
);
