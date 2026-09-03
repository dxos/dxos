//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  DebugSettings,
  LogRecording,
  MarkdownMenu,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  SpaceTemplates,
  StatsPanel,
  Translations,
} from '#capabilities';
import { meta } from '#meta';
import { Debug } from '#types';

export const DebugPlugin = Plugin.define<Debug.DebugPluginOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(DebugSettings),
  Plugin.addModule(LogRecording),
  Plugin.addModule(MarkdownMenu),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(SpaceTemplates),
  Plugin.addModule(StatsPanel),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default DebugPlugin;
