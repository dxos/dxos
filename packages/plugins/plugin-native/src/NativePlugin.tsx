//
// Copyright 2023 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { AssistantEvents } from '@dxos/plugin-assistant';

import { NativeSettings, Ollama, ReactSurface, SpotlightListener, Updater } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const NativePlugin = Plugin.define(meta).pipe(
  AppPlugin.addSettingsModule({ activate: NativeSettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'spotlight-listener',
    activatesOn: ActivationEvents.ProcessManagerReady,
    activate: SpotlightListener,
  }),
  Plugin.addModule({
    id: 'updater',
    activatesOn: ActivationEvents.ProcessManagerReady,
    activate: Updater,
  }),
  Plugin.addModule({
    id: 'ollama',
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: Ollama,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default NativePlugin;
