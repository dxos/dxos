//
// Copyright 2023 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { AppGraphBuilder, DevPluginLoader, OperationHandler, ReactSurface, RegistrySettings } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const RegistryPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSettingsModule({
    requires: RegistrySettings.requires,
    provides: RegistrySettings.provides,
    activate: RegistrySettings,
  }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: Capability.getModuleTag(DevPluginLoader),
    requires: DevPluginLoader.requires,
    provides: DevPluginLoader.provides,
    activate: DevPluginLoader,
  }),
  Plugin.make,
);

export default RegistryPlugin;
