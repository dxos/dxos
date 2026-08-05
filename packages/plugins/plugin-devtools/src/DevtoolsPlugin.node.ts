//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { AppGraphBuilder } from '#capabilities';
import { meta } from '#meta';

export const DevtoolsPlugin = Plugin.define(meta).pipe(Plugin.addModule(AppGraphBuilder), Plugin.make);

export default DevtoolsPlugin;
