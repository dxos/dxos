//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CallEvents,
  CallManager,
  CallTransport,
  OperationHandler,
  PluginAsset,
  ReactRoot,
  ReactSurface,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const CallsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CallEvents),
  Plugin.addModule(CallManager),
  Plugin.addModule(CallTransport),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactRoot),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default CallsPlugin;
