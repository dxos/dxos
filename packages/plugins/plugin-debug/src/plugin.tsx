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
  StatsPanel,
  Translations,
} from '#capabilities';
import { meta } from '#meta';
import { Debug } from '#types';

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const DebugPlugin = Plugin.define<Debug.DebugPluginOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(DebugSettings),
  Plugin.addModule(LogRecording),
  Plugin.addModule(MarkdownMenu),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(StatsPanel),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default DebugPlugin;
