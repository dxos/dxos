//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from '#meta';
import { type DebugPluginOptions } from '#types';

export const DebugPlugin = Plugin.define<DebugPluginOptions>(meta).pipe(Plugin.make);

export default DebugPlugin;
