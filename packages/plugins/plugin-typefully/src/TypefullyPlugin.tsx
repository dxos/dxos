//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { Connector, PublisherService } from '#capabilities';
import { meta } from '#meta';

import { translations } from './translations';

export const TypefullyPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupConnectors,
    activate: Connector,
  }),
  Plugin.addModule({
    id: `${meta.profile.key}/publisher-service`,
    activatesOn: ActivationEvents.Startup,
    activate: PublisherService,
  }),
  Plugin.make,
);

export default TypefullyPlugin;
