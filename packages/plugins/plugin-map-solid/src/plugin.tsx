//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { PluginAsset, Surface } from '#capabilities';
import { meta } from '#meta';

export const MapPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(PluginAsset),
  Plugin.addModule(Surface),
  Plugin.make,
);

export default MapPlugin;
