//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { AppGraphBuilder, CallManager, CallTransport, PluginAsset, ReactRoot, ReactSurface, Translations } from '#capabilities';
import { meta } from '#meta';

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const CallsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(ReactRoot),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  Plugin.addModule(CallManager),
  Plugin.addModule(CallTransport),
  Plugin.addModule(PluginAsset),
  Plugin.make,
);

export default CallsPlugin;
