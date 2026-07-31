//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { AppGraphBuilder, DevPluginLoader, OperationHandler, ReactSurface, RegistrySettings } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const RegistryPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(RegistrySettings),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(DevPluginLoader),
  Plugin.make,
);

export default RegistryPlugin;
