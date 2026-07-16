//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { OperationHandler, ReactSurface, SettingsAppGraphBuilder } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const SettingsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    requires: SettingsAppGraphBuilder.requires,
    provides: SettingsAppGraphBuilder.provides,
    activate: SettingsAppGraphBuilder,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default SettingsPlugin;
