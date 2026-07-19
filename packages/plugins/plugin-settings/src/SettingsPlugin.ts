//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { OperationHandler, ReactSurface, SettingsAppGraphBuilder } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const SettingsPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(SettingsAppGraphBuilder),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default SettingsPlugin;
