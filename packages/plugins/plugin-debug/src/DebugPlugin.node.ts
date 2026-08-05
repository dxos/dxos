//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { AppGraphBuilder, DebugSettings } from '#capabilities';
import { meta } from '#meta';
import { type DebugPluginOptions } from '#types';

export const DebugPlugin = Plugin.define<DebugPluginOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(DebugSettings),
  Plugin.make,
);

export default DebugPlugin;
