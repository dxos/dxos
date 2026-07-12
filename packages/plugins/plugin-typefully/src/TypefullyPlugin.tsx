//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { Connector } from '#capabilities';
import { meta } from '#meta';

import { translations } from './translations';

export const TypefullyPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupConnectors,
    activate: Connector,
  }),
  Plugin.make,
);

export default TypefullyPlugin;
