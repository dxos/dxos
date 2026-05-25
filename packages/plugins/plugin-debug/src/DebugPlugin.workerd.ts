//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from '#meta';
import { type DebugPluginOptions } from '#types';

export const DebugPlugin = Plugin.define<DebugPluginOptions>(meta).pipe(Plugin.make);

export default DebugPlugin;
