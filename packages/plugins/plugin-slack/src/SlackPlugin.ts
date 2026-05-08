//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { IntegrationProvider, OperationHandler } from '#capabilities';
import { meta } from '#meta';

import { translations } from './translations';

export const SlackPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupIntegrationProviders,
    activate: IntegrationProvider,
  }),
  Plugin.make,
);

export default SlackPlugin;
