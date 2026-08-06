//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Commands } from '#capabilities';
import { meta } from '#meta';

export const RegistryPlugin = Plugin.define(meta).pipe(Plugin.addModule(Commands), Plugin.make);

export default RegistryPlugin;
