//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { NativeSettings } from './settings.ts';
export { NativeOllama as Ollama } from './ollama.ts';
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export { ReactSurface } from './react-surface.ts';
export { SpotlightListener } from './spotlight-listener.ts';
export const Translations = AppCapability.translations(translations);
export { NativeUpdater as Updater } from './updater.ts';
