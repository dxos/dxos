//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { AppGraphBuilder, DebugSettings } from '#capabilities';
import { meta } from '#meta';
import { Debug } from '#types';

export const DebugPlugin = Plugin.define<Debug.DebugPluginOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(DebugSettings),
  Plugin.make,
);

export default DebugPlugin;
