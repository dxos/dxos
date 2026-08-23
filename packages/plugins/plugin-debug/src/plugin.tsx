//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { AppGraphBuilder, DebugPort, DebugSettings, LogRecording, ReactSurface, StatsPanel } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Debug } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const DebugPlugin = Plugin.define<Debug.DebugPluginOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(DebugSettings),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(LogRecording),
  Plugin.addModule(DebugPort),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(StatsPanel),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default DebugPlugin;
