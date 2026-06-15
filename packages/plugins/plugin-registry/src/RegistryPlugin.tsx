//
// Copyright 2023 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { AppGraphBuilder, DevPluginLoader, OperationHandler, ReactSurface, RegistrySettings } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const RegistryPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSettingsModule({ activate: RegistrySettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'dev-plugin-loader',
    activatesOn: ActivationEvents.Startup,
    activate: DevPluginLoader,
  }),
  Plugin.make,
);

export default RegistryPlugin;
