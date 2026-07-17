//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { NativeSettings, Ollama, ReactSurface, SpotlightListener, Updater } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const NativePlugin = Plugin.define(meta).pipe(
  AppPlugin.addSettingsModule({
    requires: NativeSettings.requires,
    provides: NativeSettings.provides,
    activate: NativeSettings,
  }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addLazyModule(SpotlightListener),
  Plugin.addLazyModule(Updater),
  Plugin.addLazyModule(Ollama),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default NativePlugin;
