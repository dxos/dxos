//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from '#meta';

import * as Debug from './types/Debug';

export const DebugPlugin = Plugin.define<Debug.DebugPluginOptions>(meta).pipe(Plugin.make);

export default DebugPlugin;
