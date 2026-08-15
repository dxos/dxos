//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { PluginAsset, Surface } from '#capabilities';
import { meta } from '#meta';

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const MapPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Surface),
  Plugin.addModule(PluginAsset),
  Plugin.make,
);

export default MapPlugin;
