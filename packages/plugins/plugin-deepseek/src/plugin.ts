//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Connector } from '#capabilities';
import { meta } from '#meta';

export const DeepSeekPlugin = Plugin.define(meta).pipe(Plugin.addModule(Connector), Plugin.make);

export default DeepSeekPlugin;
