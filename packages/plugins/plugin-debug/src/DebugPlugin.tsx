//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { AppGraphBuilder, DebugSettings, ReactSurface, StatsPanel } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { type DebugPluginOptions } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const DebugPlugin = Plugin.define<DebugPluginOptions>(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addSettingsModule({ activate: DebugSettings }),
  Plugin.addModule(({ logStore }) => ({
    id: Capability.getModuleTag(ReactSurface) ?? 'surfaces',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () => ReactSurface({ logStore }),
  })),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule(({ persistStats }) => ({
    id: 'stats-panel',
    activatesOn: ActivationEvents.Startup,
    activate: () => StatsPanel({ persist: persistStats ?? true }),
  })),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default DebugPlugin;
