//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { AppGraphBuilder, DebugSettings } from '#capabilities';
import { meta } from '#meta';
import { type DebugPluginOptions } from '#types';

export const DebugPlugin = Plugin.define<DebugPluginOptions>(meta).pipe(
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addSettingsModule({
    requires: DebugSettings.requires,
    provides: DebugSettings.provides,
    activate: DebugSettings,
  }),
  Plugin.make,
);

export default DebugPlugin;
