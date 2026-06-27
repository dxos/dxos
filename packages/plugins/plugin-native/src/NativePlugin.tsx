//
// Copyright 2023 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

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
    // Activate before `SetupProcessManager` (when `SetupAiServiceProviders` fires) so the bundled
    // sidecar's `OllamaManager` capability is committed before the assistant's `LocalModelResolver`
    // decides whether to contribute a competing default-endpoint Ollama resolver.
    id: 'ollama',
    activatesOn: AppActivationEvents.SetupSettings,
    activate: Ollama,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default NativePlugin;
