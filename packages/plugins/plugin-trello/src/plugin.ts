//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { AppGraphBuilder, Connector, OperationHandler, PluginAsset, Translations } from '#capabilities';
import { meta } from '#meta';

export const TrelloPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(Connector),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default TrelloPlugin;
