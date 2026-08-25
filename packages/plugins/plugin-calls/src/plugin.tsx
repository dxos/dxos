//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CallManager,
  CallTransport,
  PluginAsset,
  ReactRoot,
  ReactSurface,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const CallsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CallManager),
  Plugin.addModule(CallTransport),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactRoot),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default CallsPlugin;
