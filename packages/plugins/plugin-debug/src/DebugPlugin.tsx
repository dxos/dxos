//
// Copyright 2026 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { AppGraphBuilder, DebugSettings, ReactSurface, StatsPanel } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { type DebugPluginOptions } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const DebugPlugin = Plugin.define<DebugPluginOptions>(meta).pipe(
  AppPlugin.addAppGraphModule<DebugPluginOptions, typeof AppGraphBuilder.requires>({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addSettingsModule<DebugPluginOptions>({
    requires: DebugSettings.requires,
    provides: DebugSettings.provides,
    activate: DebugSettings,
  }),
  Plugin.addModule(({ logStore }: DebugPluginOptions) => ({
    id: Capability.getModuleTag(ReactSurface) ?? 'surfaces',
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: () => ReactSurface({ logStore }),
  })),
  AppPlugin.addTranslationsModule<DebugPluginOptions>({ translations }),
  Plugin.addModule(({ persistStats }: DebugPluginOptions) => ({
    id: 'stats-panel',
    requires: StatsPanel.requires,
    provides: StatsPanel.provides,
    activate: () => StatsPanel({ persist: persistStats ?? true }),
  })),
  AppPlugin.addPluginAssetModule<DebugPluginOptions>({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default DebugPlugin;
