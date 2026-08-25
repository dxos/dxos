//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { AppGraphBuilder, PluginAsset, ReactContext, ReactSurface, SetupDevtools, Translations } from '#capabilities';
import { meta } from '#meta';

export const DevtoolsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactContext),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(SetupDevtools),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default DevtoolsPlugin;
