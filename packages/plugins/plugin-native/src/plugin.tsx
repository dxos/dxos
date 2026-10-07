//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  NativeSettings,
  Ollama,
  PluginAsset,
  ReactSurface,
  SpotlightListener,
  Translations,
  Updater,
} from '#capabilities';
import { meta } from '#meta';

export const NativePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(NativeSettings),
  Plugin.addModule(Ollama),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(SpotlightListener),
  Plugin.addModule(Translations),
  Plugin.addModule(Updater),
  Plugin.make,
);

export default NativePlugin;
