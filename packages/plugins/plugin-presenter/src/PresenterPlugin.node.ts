//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { AppGraphBuilder } from '#capabilities';
import { meta } from '#meta';

export const PresenterPlugin = Plugin.define(meta).pipe(Plugin.addLazyModule(AppGraphBuilder), Plugin.make);

export default PresenterPlugin;
