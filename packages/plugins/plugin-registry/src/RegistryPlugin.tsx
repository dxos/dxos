//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { AppGraphBuilder, DevPluginLoader, OperationHandler, ReactSurface, RegistrySettings } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const RegistryPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(RegistrySettings),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(DevPluginLoader),
  Plugin.make,
);

export default RegistryPlugin;
