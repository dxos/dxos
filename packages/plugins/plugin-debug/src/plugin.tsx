//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  DebugSettings,
  LogRecording,
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
  Plugin.addModule(ReactSurface),
  Plugin.addModule(LogRecording),
  Plugin.addModule(Translations),
  Plugin.addModule(StatsPanel),
  Plugin.addModule(PluginAsset),
  Plugin.make,
);

export default DebugPlugin;
