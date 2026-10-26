//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { AppGraphBuilder, PluginAsset, ReactSurface, Recorder, Schema, Settings, Translations } from '#capabilities';
import { meta } from '#meta';

export const RecorderPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Recorder),
  Plugin.addModule(Schema),
  Plugin.addModule(Settings),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default RecorderPlugin;
